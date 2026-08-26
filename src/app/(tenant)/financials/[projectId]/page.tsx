import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShell } from "@/ui/shell/AppShell";
import { ProjectBudgetsClient } from "./ProjectBudgetsClient";
import { computeProfitability } from "@/tenant/invoicing/profitability";

export const dynamic = "force-dynamic";

export default async function ProjectBudgetsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [project, budgets, users] = await Promise.all([
    context.tenantDb.project.findUnique({ where: { id: projectId } }),
    context.tenantDb.budget.findMany({
      where: { projectId },
      include: { owner: true, sections: true },
      orderBy: { createdAt: "desc" },
    }),
    context.tenantDb.user.findMany({ orderBy: { email: "asc" } }),
  ]);

  if (!project) {
    redirect("/financials");
  }

  const budgetIds = budgets.map((budget) => budget.id);
  const billableEntries = await context.tenantDb.timeEntry.findMany({
    where: {
      budgetSection: { budgetId: { in: budgetIds } },
      durationMinutes: { not: null },
      amount: { not: null },
    },
    select: { userId: true, durationMinutes: true, amount: true },
  });
  const costRateByUserId = Object.fromEntries(users.map((user) => [user.id, user.internalCostRate]));
  const profitability = computeProfitability(
    billableEntries.map((entry) => ({
      userId: entry.userId,
      durationMinutes: entry.durationMinutes!,
      amount: entry.amount!,
    })),
    costRateByUserId,
  );

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <div className="container" style={{ maxWidth: "900px", paddingBottom: 0 }}>
        <div className="widget-card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="widget-title">Profitabilität</div>
          <div className="row" style={{ gap: "var(--space-8)" }}>
            <div>
              <div className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                Umsatz
              </div>
              <div className="coord" style={{ fontSize: "var(--text-lg)" }}>
                {profitability.revenue.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                Kosten
              </div>
              <div className="coord" style={{ fontSize: "var(--text-lg)" }}>
                {profitability.cost.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                Marge
              </div>
              <div className="coord" style={{ fontSize: "var(--text-lg)" }}>
                {profitability.margin.toFixed(2)} ({profitability.marginPercent.toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>
      </div>
      <ProjectBudgetsClient
        projectId={projectId}
        projectName={project.name}
        canManage={canManageMembers(context.currentUser.role)}
        budgets={budgets.map((budget) => ({
          id: budget.id,
          title: budget.title,
          ownerLabel: budget.owner.name ?? budget.owner.email,
          sectionCount: budget.sections.length,
          budgetTotal: budget.sections.reduce((sum, s) => sum + s.quantity * s.price, 0),
        }))}
        users={users.map((u) => ({ id: u.id, label: u.name ?? u.email }))}
      />
    </AppShell>
  );
}
