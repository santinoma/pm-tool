import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { buildInvoiceLineItems, buildExpenseLineItems } from "../src/tenant/invoicing/generateInvoice";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let ownerId: string;
let projectId: string;
let budgetId: string;
let sectionId: string;

beforeEach(async () => {
  const subdomain = `invoicing-${Date.now()}`;
  await provisionTenant({ name: "Invoicing Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  ownerId = owner.id;

  const project = await tenantDb.project.create({ data: { name: "Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
  const budget = await tenantDb.budget.create({ data: { projectId, title: "Retainer", ownerId } });
  budgetId = budget.id;
  const section = await tenantDb.budgetSection.create({
    data: { budgetId, name: "PM Steuerung", quantity: 40, price: 120 },
  });
  sectionId = section.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("invoice generation (data layer, mirrors the API route logic)", () => {
  it("marks consumed time entries with the invoice id so they can't be billed twice", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const entry = await tenantDb.timeEntry.create({
      data: {
        userId: ownerId,
        projectId,
        budgetSectionId: sectionId,
        startedAt: new Date("2026-08-01T08:00:00.000Z"),
        endedAt: new Date("2026-08-01T09:00:00.000Z"),
        durationMinutes: 60,
        amount: 120,
      },
    });

    const draft = buildInvoiceLineItems(
      [{ id: entry.id, budgetSectionId: sectionId, durationMinutes: 60, amount: 120 }],
      { [sectionId]: "PM Steuerung" },
    );

    const invoice = await tenantDb.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          budgetId,
          periodStart: new Date("2026-08-01"),
          periodEnd: new Date("2026-08-31"),
          totalAmount: draft.totalAmount,
          createdById: ownerId,
          lineItems: { create: draft.lineItems },
        },
        include: { lineItems: true },
      });
      await tx.timeEntry.updateMany({
        where: { id: { in: draft.timeEntryIds } },
        data: { invoiceId: created.id },
      });
      return created;
    });

    expect(invoice.totalAmount).toBe(120);
    expect(invoice.lineItems).toHaveLength(1);

    const updatedEntry = await tenantDb.timeEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(updatedEntry.invoiceId).toBe(invoice.id);

    const unbilled = await tenantDb.timeEntry.findMany({
      where: { budgetSectionId: sectionId, invoiceId: null },
    });
    expect(unbilled).toHaveLength(0);
  });

  it("includes approved billable expenses on the same invoice as time entries, and marks them invoiced", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const entry = await tenantDb.timeEntry.create({
      data: {
        userId: ownerId,
        projectId,
        budgetSectionId: sectionId,
        startedAt: new Date("2026-08-01T08:00:00.000Z"),
        endedAt: new Date("2026-08-01T09:00:00.000Z"),
        durationMinutes: 60,
        amount: 120,
      },
    });
    const approvedExpense = await tenantDb.expense.create({
      data: {
        projectId,
        budgetId,
        description: "Taxi zum Kunden",
        amount: 45,
        billable: true,
        approvalStatus: "approved",
        incurredAt: new Date("2026-08-05"),
        createdById: ownerId,
      },
    });
    // Not billable — must not appear on the invoice.
    const nonBillableExpense = await tenantDb.expense.create({
      data: {
        projectId,
        budgetId,
        description: "Interner Kaffee",
        amount: 10,
        billable: false,
        approvalStatus: "approved",
        incurredAt: new Date("2026-08-06"),
        createdById: ownerId,
      },
    });
    // Still pending — must not appear on the invoice.
    const pendingExpense = await tenantDb.expense.create({
      data: {
        projectId,
        budgetId,
        description: "Zugticket",
        amount: 60,
        billable: true,
        approvalStatus: "pending",
        incurredAt: new Date("2026-08-07"),
        createdById: ownerId,
      },
    });

    const timeDraft = buildInvoiceLineItems(
      [{ id: entry.id, budgetSectionId: sectionId, durationMinutes: 60, amount: 120 }],
      { [sectionId]: "PM Steuerung" },
    );
    const expenseDraft = buildExpenseLineItems([{ id: approvedExpense.id, description: approvedExpense.description, amount: 45 }]);

    const invoice = await tenantDb.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          budgetId,
          periodStart: new Date("2026-08-01"),
          periodEnd: new Date("2026-08-31"),
          totalAmount: timeDraft.totalAmount + expenseDraft.totalAmount,
          createdById: ownerId,
          lineItems: { create: [...timeDraft.lineItems, ...expenseDraft.lineItems] },
        },
        include: { lineItems: true },
      });
      await tx.timeEntry.updateMany({ where: { id: { in: timeDraft.timeEntryIds } }, data: { invoiceId: created.id } });
      await tx.expense.updateMany({ where: { id: { in: expenseDraft.expenseIds } }, data: { invoiceId: created.id } });
      return created;
    });

    expect(invoice.totalAmount).toBe(165);
    expect(invoice.lineItems).toHaveLength(2);

    const updatedExpense = await tenantDb.expense.findUniqueOrThrow({ where: { id: approvedExpense.id } });
    expect(updatedExpense.invoiceId).toBe(invoice.id);

    const untouchedNonBillable = await tenantDb.expense.findUniqueOrThrow({ where: { id: nonBillableExpense.id } });
    expect(untouchedNonBillable.invoiceId).toBeNull();
    const untouchedPending = await tenantDb.expense.findUniqueOrThrow({ where: { id: pendingExpense.id } });
    expect(untouchedPending.invoiceId).toBeNull();
  });
});
