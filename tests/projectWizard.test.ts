import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { buildClonedStatuses } from "../src/tenant/projectTemplates/cloneProjectTemplate";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `projwizard-${Date.now()}`;
  await provisionTenant({ name: "Wizard Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Project template cloning (data layer)", () => {
  it("clones a template project's workflow statuses onto a new project", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const template = await tenantDb.project.create({
      data: {
        name: "Template Project",
        isTemplate: true,
        workflow: {
          create: {
            name: "Template Workflow",
            statuses: {
              create: [
                { name: "Backlog", category: "not_started", position: 0, isDefault: true },
                { name: "Review", category: "started", position: 1, isDefault: false },
                { name: "Shipped", category: "done", position: 2, isDefault: false },
              ],
            },
          },
        },
      },
      include: { workflow: { include: { statuses: true } } },
    });

    const clonedStatuses = buildClonedStatuses(template.workflow.statuses);
    const newProject = await tenantDb.project.create({
      data: { name: "Cloned Project", workflow: { create: { name: "Test Workflow", statuses: { create: clonedStatuses } } } },
      include: { workflow: { include: { statuses: true } } },
    });

    expect(newProject.workflow.statuses.map((s) => s.name)).toEqual(["Backlog", "Review", "Shipped"]);
    expect(newProject.workflow.statuses[0].isDefault).toBe(true);
  });

  it("creating a project always adds the creator as a member, avoiding self-lockout", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const member = await tenantDb.user.create({ data: { email: "creator@example.com", role: "member" } });
    const project = await tenantDb.project.create({
      data: { name: "Alpha", workflow: { create: { name: "Test Workflow" } }, members: { create: { userId: member.id } } },
      include: { members: true },
    });

    expect(project.members).toHaveLength(1);
    expect(project.members[0].userId).toBe(member.id);
  });
});
