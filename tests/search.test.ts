import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `search-${Date.now()}`;
  await provisionTenant({ name: "Search Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("search (data layer, mirrors the /api/tenant/search route)", () => {
  it("finds projects by a case-insensitive substring match", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.project.create({
      data: { name: "Website Relaunch", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
    });

    const results = await tenantDb.project.findMany({
      where: { name: { contains: "relaunch", mode: "insensitive" } },
    });
    expect(results).toHaveLength(1);
  });

  it("finds tasks by a case-insensitive substring match", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({
      data: { name: "Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
      include: { workflow: { include: { statuses: true } } },
    });
    await tenantDb.task.create({
      data: {
        title: "Fix login bug",
        statusId: project.workflow.statuses[0].id,
        projects: { create: { projectId: project.id } },
      },
    });

    const results = await tenantDb.task.findMany({
      where: { title: { contains: "LOGIN", mode: "insensitive" } },
    });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Fix login bug");
  });

  it("returns no results for a non-matching query", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const results = await tenantDb.task.findMany({
      where: { title: { contains: "nonexistent-xyz", mode: "insensitive" } },
    });
    expect(results).toHaveLength(0);
  });
});
