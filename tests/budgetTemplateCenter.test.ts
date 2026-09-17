import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { POST as createBudget } from "@/app/api/tenant/budgets/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let owner: User;
let sourceProjectId: string;
let otherProjectId: string;
let templateBudgetId: string;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

beforeEach(async () => {
  const subdomain = `budgettemplates-${Date.now()}`;
  await provisionTenant({ name: "Budget Templates Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  const sourceProject = await tenantDb.project.create({ data: { name: "Source Project", workflow: { create: { name: "Test Workflow" } } } });
  sourceProjectId = sourceProject.id;
  const otherProject = await tenantDb.project.create({ data: { name: "Other Project", workflow: { create: { name: "Test Workflow" } } } });
  otherProjectId = otherProject.id;
  await tenantDb.projectMember.create({ data: { projectId: otherProjectId, userId: owner.id } });

  const template = await tenantDb.budget.create({
    data: {
      title: "Standard Retainer Vorlage",
      projectId: sourceProjectId,
      ownerId: owner.id,
      isTemplate: true,
      sections: { create: [{ name: "Consulting", quantity: 10, price: 100, position: 0 }] },
    },
  });
  templateBudgetId = template.id;
});

afterEach(async () => {
  vi.clearAllMocks();
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Budget Template Center (T311): org-wide template reuse", () => {
  it("allows creating a budget from a template that belongs to a different project", async () => {
    setCurrentUser(owner);
    const response = await createBudget(
      new Request("http://tenant.local/api/tenant/budgets", {
        method: "POST",
        body: JSON.stringify({ projectId: otherProjectId, title: "New Budget", ownerId: owner.id, templateBudgetId }),
      }),
    );
    expect(response.status).toBe(201);
    const { budget } = await response.json();
    expect(budget.projectId).toBe(otherProjectId);

    const sections = await tenantDb.budgetSection.findMany({ where: { budgetId: budget.id } });
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe("Consulting");
    expect(sections[0].price).toBe(100);
  });

  it("still rejects a non-template budget id, regardless of project", async () => {
    setCurrentUser(owner);
    const nonTemplate = await tenantDb.budget.create({
      data: { title: "Live Budget", projectId: sourceProjectId, ownerId: owner.id },
    });

    const response = await createBudget(
      new Request("http://tenant.local/api/tenant/budgets", {
        method: "POST",
        body: JSON.stringify({ projectId: otherProjectId, title: "New Budget", ownerId: owner.id, templateBudgetId: nonTemplate.id }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
