import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { POST as CREATE_PROJECT } from "@/app/api/tenant/projects/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let owner: User;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

async function createProject(name: string) {
  const response = await CREATE_PROJECT(
    new Request("http://tenant.local/api/tenant/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
  expect(response.status).toBe(201);
  const { project } = await response.json();
  return project as { id: string };
}

beforeEach(async () => {
  const subdomain = `autoattach-${Date.now()}`;
  await provisionTenant({ name: "Auto-Attach Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);
  owner = await tenantDb.user.create({ data: { email: "owner@example.com", role: "owner" } });
  setCurrentUser(owner);
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Library field auto-attach on project creation", () => {
  it("attaches an autoAttach library field to a newly created project", async () => {
    const field = await tenantDb.customFieldDef.create({
      data: { library: true, entityType: "task", key: "risk_level", label: "Risk Level", type: "text", options: [], autoAttach: true },
    });

    const project = await createProject("Auto-Attach Project");

    const attachment = await tenantDb.projectCustomField.findUnique({
      where: { projectId_fieldId: { projectId: project.id, fieldId: field.id } },
    });
    expect(attachment).not.toBeNull();
  });

  it("does not attach a library field without autoAttach", async () => {
    const field = await tenantDb.customFieldDef.create({
      data: { library: true, entityType: "task", key: "manual_field", label: "Manual Field", type: "text", options: [] },
    });

    const project = await createProject("Manual Attach Project");

    const attachment = await tenantDb.projectCustomField.findUnique({
      where: { projectId_fieldId: { projectId: project.id, fieldId: field.id } },
    });
    expect(attachment).toBeNull();
  });

  it("does not attach a user-scoped (Employee Field) autoAttach field to projects", async () => {
    const field = await tenantDb.customFieldDef.create({
      data: { library: true, entityType: "user", key: "personnel_number", label: "Personalnummer", type: "text", options: [], autoAttach: true },
    });

    const project = await createProject("No Employee Field Project");

    const attachment = await tenantDb.projectCustomField.findUnique({
      where: { projectId_fieldId: { projectId: project.id, fieldId: field.id } },
    });
    expect(attachment).toBeNull();
  });
});
