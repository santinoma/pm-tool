import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `proj-${Date.now()}`;
  await provisionTenant({ name: "Projects Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("project creation (data layer)", () => {
  it("creates a project with the default workflow statuses attached", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    const project = await tenantDb.project.create({
      data: { name: "Website Relaunch", statuses: { create: defaultWorkflowStatuses() } },
      include: { statuses: true },
    });

    expect(project.statuses).toHaveLength(3);
    const defaultStatus = project.statuses.find((s) => s.isDefault);
    expect(defaultStatus?.name).toBe("Todo");
    expect(defaultStatus?.category).toBe("not_started");
  });

  it("lists projects for the tenant", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.project.create({
      data: { name: "Projekt A", statuses: { create: defaultWorkflowStatuses() } },
    });
    await tenantDb.project.create({
      data: { name: "Projekt B", statuses: { create: defaultWorkflowStatuses() } },
    });

    const projects = await tenantDb.project.findMany();
    expect(projects).toHaveLength(2);
  });
});
