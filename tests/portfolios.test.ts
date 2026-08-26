import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { computePortfolioProgress } from "../src/tenant/portfolios/portfolioProgress";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `portfoliocap-${Date.now()}`;
  await provisionTenant({ name: "Portfolio Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Portfolios and Goals (data layer, mirrors /api/tenant/portfolios)", () => {
  it("assigns projects to a portfolio and computes live goal progress from task completion", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    const portfolio = await tenantDb.portfolio.create({ data: { name: "Q3 Initiative" } });
    const goal = await tenantDb.goal.create({
      data: { portfolioId: portfolio.id, name: "Ship v2", status: "on_track" },
    });

    const projectA = await tenantDb.project.create({ data: { name: "A", portfolioId: portfolio.id } });
    const projectB = await tenantDb.project.create({ data: { name: "B", portfolioId: portfolio.id } });
    const statusDone = await tenantDb.workflowStatus.create({
      data: { projectId: projectA.id, name: "Done", category: "done", position: 1, isDefault: false },
    });
    const statusTodo = await tenantDb.workflowStatus.create({
      data: { projectId: projectA.id, name: "Todo", category: "not_started", position: 0, isDefault: true },
    });

    await tenantDb.task.create({
      data: { title: "t1", statusId: statusDone.id, projects: { create: { projectId: projectA.id, isPrimary: true } } },
    });
    await tenantDb.task.create({
      data: { title: "t2", statusId: statusTodo.id, projects: { create: { projectId: projectB.id, isPrimary: true } } },
    });

    const projects = await tenantDb.project.findMany({ where: { portfolioId: portfolio.id } });
    expect(projects.map((p) => p.id).sort()).toEqual([projectA.id, projectB.id].sort());

    const tasks = await tenantDb.task.findMany({
      where: { projects: { some: { projectId: { in: projects.map((p) => p.id) } } } },
      include: { status: true },
    });
    const progress = computePortfolioProgress(tasks.map((t) => ({ statusCategory: t.status.category })));
    expect(progress).toBe(50);

    const updatedGoal = await tenantDb.goal.update({ where: { id: goal.id }, data: { status: "at_risk" } });
    expect(updatedGoal.status).toBe("at_risk");
  });
});
