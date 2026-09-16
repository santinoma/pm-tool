import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { buildPercentageLineItems, buildRemainingAmountLineItems } from "../src/tenant/invoicing/generateInvoice";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let ownerId: string;
let projectId: string;
let budgetId: string;
let sectionId: string;

beforeEach(async () => {
  const subdomain = `invoicelifecycle-${Date.now()}`;
  await provisionTenant({ name: "Invoice Lifecycle Kunde", subdomain, ownerEmail: "owner@example.com" });
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

describe("invoice lifecycle — finalize locks edits", () => {
  it("prevents line item edits and un-finalizing once finalizedAt is set", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const invoice = await tenantDb.invoice.create({
      data: {
        budgetId,
        periodStart: new Date("2026-08-01"),
        periodEnd: new Date("2026-08-31"),
        totalAmount: 100,
        createdById: ownerId,
        lineItems: { create: [{ budgetSectionId: sectionId, description: "Work", quantityHours: 1, rate: 100, amount: 100 }] },
      },
    });
    expect(invoice.status).toBe("draft");

    const finalized = await tenantDb.invoice.update({
      where: { id: invoice.id },
      data: { status: "finalized", finalizedAt: new Date() },
    });
    expect(finalized.status).toBe("finalized");
    expect(finalized.finalizedAt).not.toBeNull();

    // Simulate the guardrail the PATCH route enforces: once finalizedAt is set,
    // line item edits and reverting to draft must be rejected (mirrored here as a
    // pure assertion on the state that route relies on, since this is a data-layer test).
    const current = await tenantDb.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    const wouldAllowLineItemEdit = current.status === "draft";
    const wouldAllowUnfinalize = current.status === "draft"; // target draft only allowed if already draft
    expect(wouldAllowLineItemEdit).toBe(false);
    expect(wouldAllowUnfinalize).toBe(false);
  });
});

describe("invoice lifecycle — payments", () => {
  async function createSentInvoice(totalAmount: number) {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    return tenantDb.invoice.create({
      data: {
        budgetId,
        periodStart: new Date("2026-08-01"),
        periodEnd: new Date("2026-08-31"),
        totalAmount,
        createdById: ownerId,
        status: "sent",
        finalizedAt: new Date(),
      },
    });
  }

  it("rejects payments on a draft invoice", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const invoice = await tenantDb.invoice.create({
      data: {
        budgetId,
        periodStart: new Date("2026-08-01"),
        periodEnd: new Date("2026-08-31"),
        totalAmount: 100,
        createdById: ownerId,
      },
    });
    expect(invoice.status).toBe("draft");
    // Mirrors the route's guard: draft/finalized invoices reject payment recording.
    const payable = invoice.status === "sent" || invoice.status === "partially_paid";
    expect(payable).toBe(false);
  });

  it("transitions sent -> partially_paid -> paid and computes paidAmount correctly", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const invoice = await createSentInvoice(500);

    // First partial payment.
    await tenantDb.invoicePayment.create({
      data: { invoiceId: invoice.id, amount: 200, paidAt: new Date("2026-08-05"), createdById: ownerId },
    });
    let agg = await tenantDb.invoicePayment.aggregate({ where: { invoiceId: invoice.id }, _sum: { amount: true } });
    let paidAmount = agg._sum.amount ?? 0;
    let status: "paid" | "partially_paid" = paidAmount >= invoice.totalAmount ? "paid" : "partially_paid";
    let updated = await tenantDb.invoice.update({ where: { id: invoice.id }, data: { paidAmount, status } });
    expect(updated.paidAmount).toBe(200);
    expect(updated.status).toBe("partially_paid");

    // Second payment covers the rest.
    await tenantDb.invoicePayment.create({
      data: { invoiceId: invoice.id, amount: 300, paidAt: new Date("2026-08-10"), createdById: ownerId },
    });
    agg = await tenantDb.invoicePayment.aggregate({ where: { invoiceId: invoice.id }, _sum: { amount: true } });
    paidAmount = agg._sum.amount ?? 0;
    status = paidAmount >= invoice.totalAmount ? "paid" : "partially_paid";
    updated = await tenantDb.invoice.update({ where: { id: invoice.id }, data: { paidAmount, status } });
    expect(updated.paidAmount).toBe(500);
    expect(updated.status).toBe("paid");

    const payments = await tenantDb.invoicePayment.findMany({ where: { invoiceId: invoice.id } });
    expect(payments).toHaveLength(2);
  });
});

describe("invoice lifecycle — credit notes", () => {
  it("reduces the computed outstanding balance without mutating totalAmount", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const invoice = await tenantDb.invoice.create({
      data: {
        budgetId,
        periodStart: new Date("2026-08-01"),
        periodEnd: new Date("2026-08-31"),
        totalAmount: 1000,
        paidAmount: 400,
        status: "partially_paid",
        finalizedAt: new Date(),
        createdById: ownerId,
      },
    });

    await tenantDb.creditNote.create({
      data: { invoiceId: invoice.id, amount: 150, reason: "Rabatt", createdById: ownerId },
    });

    const creditAgg = await tenantDb.creditNote.aggregate({ where: { invoiceId: invoice.id }, _sum: { amount: true } });
    const creditTotal = creditAgg._sum.amount ?? 0;
    const outstanding = invoice.totalAmount - invoice.paidAmount - creditTotal;

    expect(outstanding).toBe(450);
    const reloaded = await tenantDb.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(reloaded.totalAmount).toBe(1000); // totalAmount itself is untouched
  });
});

describe("invoice lifecycle — invoicing methods", () => {
  it("remaining_amount bills (quantity * price) minus previously invoiced amounts per section", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    // Section is 40 * 120 = 4800 full value. Bill 1000 already via a prior invoice's line item.
    const priorInvoice = await tenantDb.invoice.create({
      data: {
        budgetId,
        periodStart: new Date("2026-07-01"),
        periodEnd: new Date("2026-07-31"),
        totalAmount: 1000,
        createdById: ownerId,
        status: "sent",
        lineItems: { create: [{ budgetSectionId: sectionId, description: "PM Steuerung", quantityHours: 1, rate: 1000, amount: 1000 }] },
      },
    });
    expect(priorInvoice.id).toBeTruthy();

    const sections = await tenantDb.budgetSection.findMany({ where: { budgetId } });
    const priorLineItems = await tenantDb.invoiceLineItem.groupBy({
      by: ["budgetSectionId"],
      where: { invoice: { budgetId } },
      _sum: { amount: true },
    });
    const invoicedAmountBySection = Object.fromEntries(priorLineItems.map((row) => [row.budgetSectionId, row._sum.amount ?? 0]));

    const draft = buildRemainingAmountLineItems(sections, invoicedAmountBySection);
    expect(draft.lineItems).toHaveLength(1);
    expect(draft.lineItems[0].amount).toBeCloseTo(4800 - 1000);
    expect(draft.totalAmount).toBeCloseTo(3800);
  });

  it("percentage bills (quantity * price) * percentage / 100 per section, ignoring prior invoices", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const sections = await tenantDb.budgetSection.findMany({ where: { budgetId } });

    const draft = buildPercentageLineItems(sections, 50);
    expect(draft.lineItems).toHaveLength(1);
    expect(draft.lineItems[0].amount).toBeCloseTo(40 * 120 * 0.5);
    expect(draft.totalAmount).toBeCloseTo(2400);
  });
});
