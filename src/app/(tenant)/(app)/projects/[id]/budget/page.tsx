import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { aggregateByProject } from "@/tenant/timeTracking/duration";
import { computeBudgetStatus } from "@/tenant/budgeting/aggregate";
import { BudgetClient } from "./BudgetClient";

export const dynamic = "force-dynamic";

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [project, entries, taskLinks, settings] = await Promise.all([
    context.tenantDb.project.findUnique({ where: { id } }),
    context.tenantDb.timeEntry.findMany({
      where: { durationMinutes: { not: null } },
      select: { taskId: true, projectId: true, durationMinutes: true },
    }),
    context.tenantDb.taskProject.findMany({
      where: { isPrimary: true },
      select: { taskId: true, projectId: true, isPrimary: true },
    }),
    getOrCreateTenantSettings(context.tenantDb),
  ]);

  if (!project) {
    redirect("/projects");
  }

  const actualMinutesByProject = aggregateByProject(entries, taskLinks);
  const { actualHours, actualAmount } = computeBudgetStatus(
    actualMinutesByProject[id] ?? 0,
    project.hourlyRate,
  );

  return (
    <BudgetClient
      projectId={id}
      canEdit={canManageMembers(context.currentUser.role)}
      currency={settings.currency}
      budget={{
        budgetHours: project.budgetHours,
        budgetAmount: project.budgetAmount,
        hourlyRate: project.hourlyRate,
      }}
      actualHours={actualHours}
      actualAmount={actualAmount}
    />
  );
}
