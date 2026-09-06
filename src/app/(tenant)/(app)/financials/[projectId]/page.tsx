import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { hasProjectMemberAccess } from "@/tenant/projectAccess/resolveProjectMembership";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { ProjectBudgetsClient } from "./ProjectBudgetsClient";
import { computeProfitability } from "@/tenant/invoicing/profitability";
import { computeServiceTotal } from "@/tenant/budgeting/servicePricing";
import { computeBudgetPeriodKey } from "@/tenant/budgeting/recurrencePeriod";
import { buildRecurringBudgetClone } from "@/tenant/budgeting/cloneRecurringBudget";
import type { BillingType, TrackingUnit } from "@/generated/tenant-client/client.js";

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

  const project = await context.tenantDb.project.findUnique({ where: { id: projectId } });

  if (!project) {
    redirect("/financials");
  }
  if (!(await hasProjectMemberAccess(context.tenantDb, context.currentUser, projectId))) {
    redirect("/financials");
  }

  // Pull-based Retainer-Wiederholung: statt echter Cron-Infrastruktur wird beim Laden
  // der Budgetliste geprüft, ob für ein Retainer-Budget bereits eine Instanz für die
  // aktuelle Periode existiert (gleiches Muster wie computePeriodKey bei Check-ins).
  // Nur das Original-Retainer-Budget wiederholt sich weiter — generierte Instanzen
  // sind eigenständige, nicht-wiederkehrende Budgets (siehe buildRecurringBudgetClone).
  const retainerBudgets = await context.tenantDb.budget.findMany({
    where: { projectId, isRetainer: true, isScenario: false, isTemplate: false },
    include: { sections: true },
  });
  for (const retainer of retainerBudgets) {
    if (!retainer.recurrenceInterval) continue;
    const currentPeriodKey = computeBudgetPeriodKey(new Date(), retainer.recurrenceInterval);
    if (retainer.lastRecurrencePeriodKey === currentPeriodKey) continue;

    const clone = buildRecurringBudgetClone(
      {
        title: retainer.title,
        projectId: retainer.projectId,
        ownerId: retainer.ownerId,
        recurrenceInterval: retainer.recurrenceInterval,
      },
      retainer.sections,
    );
    await context.tenantDb.budget.create({
      data: {
        title: clone.title,
        projectId: clone.projectId,
        ownerId: clone.ownerId,
        isRetainer: clone.isRetainer,
        recurrenceInterval: clone.recurrenceInterval,
        sections: {
          create: clone.sections.map((section) => ({
            ...section,
            billingType: section.billingType as BillingType,
            trackingUnit: section.trackingUnit as TrackingUnit,
          })),
        },
      },
    });
    await context.tenantDb.budget.update({
      where: { id: retainer.id },
      data: { lastRecurrencePeriodKey: currentPeriodKey },
    });
  }

  const [budgets, users, templates] = await Promise.all([
    context.tenantDb.budget.findMany({
      where: { projectId, isScenario: false },
      include: { owner: true, sections: true },
      orderBy: { createdAt: "desc" },
    }),
    context.tenantDb.user.findMany({ orderBy: { email: "asc" } }),
    context.tenantDb.budget.findMany({
      where: { projectId, isTemplate: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

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
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle={project.name}
    >
      <div className="mx-auto max-w-3xl">
        <Card className="mb-6">
          <CardContent>
            <div className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Profitabilität</div>
            <div className="flex gap-8">
              <div>
                <div className="text-xs text-muted-foreground">Umsatz</div>
                <div className="font-mono text-lg font-semibold">{profitability.revenue.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Kosten</div>
                <div className="font-mono text-lg font-semibold">{profitability.cost.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Marge</div>
                <div className="font-mono text-lg font-semibold">
                  {profitability.margin.toFixed(2)} ({profitability.marginPercent.toFixed(1)}%)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
          budgetTotal: budget.sections.reduce(
            (sum, s) => sum + computeServiceTotal(s.quantity, s.price, s.discountPercent, s.markupPercent),
            0,
          ),
        }))}
        users={users.map((u) => ({ id: u.id, label: u.name ?? u.email }))}
        templates={templates.map((t) => ({ id: t.id, title: t.title }))}
      />
    </AppShellNextElite>
  );
}
