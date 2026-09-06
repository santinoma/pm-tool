import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { FinancialsClient } from "./FinancialsClient";

export const dynamic = "force-dynamic";

export default async function FinancialsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  const canManage = canManageMembers(context.currentUser.role);

  const budgets = await context.tenantDb.budget.findMany({
    where: canManage ? undefined : { project: { members: { some: { userId: context.currentUser.id } } } },
    orderBy: { updatedAt: "desc" },
    include: {
      project: { select: { id: true, name: true, type: true, projectManager: { select: { name: true, email: true } } } },
      sections: { select: { id: true, budgetedTimeHours: true, price: true, quantity: true } },
    },
  });

  // Revenue and logged time are aggregated in SQL instead of loading every invoice/time-entry
  // row into Node and reducing over them — the previous approach didn't scale with tenant size.
  const budgetIds = budgets.map((b) => b.id);
  const sectionIds = budgets.flatMap((b) => b.sections.map((s) => s.id));
  const [revenueByBudget, minutesBySection] = await Promise.all([
    budgetIds.length > 0
      ? context.tenantDb.invoice.groupBy({
          by: ["budgetId"],
          where: { budgetId: { in: budgetIds }, status: { not: "draft" } },
          _sum: { totalAmount: true },
        })
      : [],
    sectionIds.length > 0
      ? context.tenantDb.timeEntry.groupBy({
          by: ["budgetSectionId"],
          where: { budgetSectionId: { in: sectionIds }, durationMinutes: { not: null } },
          _sum: { durationMinutes: true },
        })
      : [],
  ]);
  const revenueByBudgetId = new Map(revenueByBudget.map((r) => [r.budgetId, r._sum.totalAmount ?? 0]));
  const minutesBySectionId = new Map(minutesBySection.map((r) => [r.budgetSectionId!, r._sum.durationMinutes ?? 0]));

  const rows = budgets.map((budget) => {
    const revenue = revenueByBudgetId.get(budget.id) ?? 0;
    const budgetedAmount = budget.sections.reduce((sum, section) => sum + section.price * section.quantity, 0);
    const invoicedPercent = budgetedAmount > 0 ? Math.round((revenue / budgetedAmount) * 100) : 0;
    const budgetedTimeHours = budget.sections.reduce((sum, section) => sum + (section.budgetedTimeHours ?? 0), 0);
    const usedTimeHours = budget.sections.reduce((sum, section) => sum + (minutesBySectionId.get(section.id) ?? 0), 0) / 60;

    return {
      id: budget.id,
      title: budget.title,
      projectId: budget.projectId,
      projectName: budget.project.name,
      projectType: budget.project.type,
      projectManagerName: budget.project.projectManager?.name ?? budget.project.projectManager?.email ?? null,
      timeApprovalRequired: false,
      expenseApprovalRequired: false,
      invoicedPercent,
      revenue,
      budgetedTimeHours,
      usedTimeHours,
    };
  });

  // Time/Expense approval are project-level flags; merge them in per-project.
  const projectIds = Array.from(new Set(budgets.map((b) => b.projectId)));
  const projectFlags = await context.tenantDb.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, timeApprovalRequired: true, expenseApprovalRequired: true },
  });
  const flagsByProjectId = new Map(projectFlags.map((p) => [p.id, p]));
  for (const row of rows) {
    const flags = flagsByProjectId.get(row.projectId);
    if (flags) {
      row.timeApprovalRequired = flags.timeApprovalRequired;
      row.expenseApprovalRequired = flags.expenseApprovalRequired;
    }
  }

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Financials"
    >
      <FinancialsClient budgets={rows} />
    </AppShellNextElite>
  );
}
