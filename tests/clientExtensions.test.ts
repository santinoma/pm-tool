import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import { wouldCreateCycle } from "../src/tenant/clients/hierarchy";

let tenant: Tenant;
let userId: string;

beforeEach(async () => {
  const subdomain = `clientext-${Date.now()}`;
  await provisionTenant({ name: "Client Extensions Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const user = await tenantDb.user.create({ data: { email: "user@example.com", role: "member" } });
  userId = user.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("client — archive/restore", () => {
  it("archives a client and restores it", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const client = await tenantDb.client.create({ data: { name: "Acme GmbH" } });
    expect(client.archivedAt).toBeNull();

    const archived = await tenantDb.client.update({
      where: { id: client.id },
      data: { archivedAt: new Date() },
    });
    expect(archived.archivedAt).not.toBeNull();

    const activeOnly = await tenantDb.client.findMany({ where: { archivedAt: null } });
    expect(activeOnly.map((c) => c.id)).not.toContain(client.id);

    const restored = await tenantDb.client.update({ where: { id: client.id }, data: { archivedAt: null } });
    expect(restored.archivedAt).toBeNull();

    const activeAfterRestore = await tenantDb.client.findMany({ where: { archivedAt: null } });
    expect(activeAfterRestore.map((c) => c.id)).toContain(client.id);
  });
});

describe("client — contacts", () => {
  it("un-marks the previous primary contact when a second one is added as primary", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const client = await tenantDb.client.create({ data: { name: "Beta AG" } });

    const first = await tenantDb.clientContact.create({
      data: { clientId: client.id, name: "Alice", isPrimary: true },
    });

    // Simulate the transactional un-mark-then-create the API route performs.
    const second = await tenantDb.$transaction(async (tx) => {
      await tx.clientContact.updateMany({ where: { clientId: client.id, isPrimary: true }, data: { isPrimary: false } });
      return tx.clientContact.create({ data: { clientId: client.id, name: "Bob", isPrimary: true } });
    });

    const refreshedFirst = await tenantDb.clientContact.findUnique({ where: { id: first.id } });
    expect(refreshedFirst?.isPrimary).toBe(false);
    expect(second.isPrimary).toBe(true);

    const primaries = await tenantDb.clientContact.findMany({ where: { clientId: client.id, isPrimary: true } });
    expect(primaries).toHaveLength(1);
    expect(primaries[0].id).toBe(second.id);
  });
});

describe("client — parent/child hierarchy", () => {
  it("rejects assigning a client's own descendant as its parent (cycle)", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const a = await tenantDb.client.create({ data: { name: "A Holding" } });
    const b = await tenantDb.client.create({ data: { name: "B Subsidiary", parentId: a.id } });
    const c = await tenantDb.client.create({ data: { name: "C Subsidiary", parentId: b.id } });

    const allClients = await tenantDb.client.findMany({ select: { id: true, parentId: true } });

    // A -> C would create a cycle (C is a descendant of A via B).
    expect(wouldCreateCycle(a.id, c.id, allClients)).toBe(true);
    // A -> itself is also a cycle.
    expect(wouldCreateCycle(a.id, a.id, allClients)).toBe(true);
    // A -> some unrelated client is fine.
    const d = await tenantDb.client.create({ data: { name: "D Unrelated" } });
    expect(wouldCreateCycle(a.id, d.id, allClients.concat({ id: d.id, parentId: null }))).toBe(false);
  });
});

describe("client — activity feed", () => {
  it("aggregates activity events across multiple projects of the same client", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const client = await tenantDb.client.create({ data: { name: "Gamma Inc" } });
    const projectOne = await tenantDb.project.create({ data: { name: "Project One", client: { connect: { id: client.id } }, workflow: { create: { name: "Test Workflow" } } } });
    const projectTwo = await tenantDb.project.create({ data: { name: "Project Two", client: { connect: { id: client.id } }, workflow: { create: { name: "Test Workflow" } } } });
    const unrelatedProject = await tenantDb.project.create({ data: { name: "Unrelated Project", workflow: { create: { name: "Test Workflow" } } } });

    await tenantDb.activityEvent.create({
      data: { projectId: projectOne.id, actorId: userId, type: "task_created", summary: "Task A erstellt" },
    });
    await tenantDb.activityEvent.create({
      data: { projectId: projectTwo.id, actorId: userId, type: "task_created", summary: "Task B erstellt" },
    });
    await tenantDb.activityEvent.create({
      data: { projectId: unrelatedProject.id, actorId: userId, type: "task_created", summary: "Task C erstellt" },
    });

    const projects = await tenantDb.project.findMany({ where: { clientId: client.id }, select: { id: true, name: true } });
    const projectIds = projects.map((p) => p.id);
    const events = await tenantDb.activityEvent.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    expect(events).toHaveLength(2);
    expect(events.map((e) => e.summary).sort()).toEqual(["Task A erstellt", "Task B erstellt"]);
    expect(events.some((e) => e.summary === "Task C erstellt")).toBe(false);
  });
});
