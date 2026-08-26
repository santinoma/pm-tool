import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShell } from "@/ui/shell/AppShell";
import { BudgetDetailClient } from "./BudgetDetailClient";
import { InvoicesClient } from "./InvoicesClient";
import { RetainerBurnPanel } from "./RetainerBurnPanel";
import { computeCurrentPeriod } from "@/tenant/retainer/period";
import { computeSectionBurn } from "@/tenant/retainer/burn";

export const dynamic = "force-dynamic";

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; budgetId: string }>;
}) {
  const { projectId, budgetId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [budget, users, invoices] = await Promise.all([
    context.tenantDb.budget.findUnique({
      where: { id: budgetId },
      include: {
        owner: true,
        sections: { include: { assignees: { include: { user: true } } }, orderBy: { createdAt: "asc" } },
      },
    }),
    context.tenantDb.user.findMany({ orderBy: { email: "asc" } }),
    context.tenantDb.invoice.findMany({
      where: { budgetId },
      include: { lineItems: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!budget) {
    redirect(`/financials/${projectId}`);
  }

  let retainerBurn = null;
  if (budget.isRetainer && budget.recurrenceInterval) {
    const period = computeCurrentPeriod(budget.recurrenceInterval, new Date());
    const sectionIds = budget.sections.map((section) => section.id);
    const entries = await context.tenantDb.timeEntry.findMany({
      where: {
        budgetSectionId: { in: sectionIds },
        startedAt: { gte: period.start, lte: period.end },
        durationMinutes: { not: null },
      },
      select: { budgetSectionId: true, durationMinutes: true },
    });
    retainerBurn = {
      periodStart: period.start.toISOString().slice(0, 10),
      periodEnd: period.end.toISOString().slice(0, 10),
      interval: budget.recurrenceInterval,
      burn: computeSectionBurn(
        budget.sections.map((section) => ({ id: section.id, name: section.name, quantity: section.quantity })),
        entries.map((entry) => ({
          budgetSectionId: entry.budgetSectionId!,
          durationMinutes: entry.durationMinutes!,
        })),
      ),
    };
  }

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <BudgetDetailClient
        projectId={projectId}
        canManage={canManageMembers(context.currentUser.role)}
        budget={{
          id: budget.id,
          title: budget.title,
          ownerLabel: budget.owner.name ?? budget.owner.email,
        }}
        sections={budget.sections.map((section) => ({
          id: section.id,
          name: section.name,
          budgetedTimeHours: section.budgetedTimeHours,
          quantity: section.quantity,
          price: section.price,
          budgetUsed: section.budgetUsed,
          assigneeIds: section.assignees.map((a) => a.userId),
          assigneeLabels: section.assignees.map((a) => a.user.name ?? a.user.email),
        }))}
        users={users.map((u) => ({ id: u.id, label: u.name ?? u.email }))}
      />
      {retainerBurn && <RetainerBurnPanel {...retainerBurn} />}
      <InvoicesClient
        budgetId={budget.id}
        canManage={canManageMembers(context.currentUser.role)}
        invoices={invoices.map((invoice) => ({
          id: invoice.id,
          status: invoice.status,
          periodStart: invoice.periodStart.toISOString().slice(0, 10),
          periodEnd: invoice.periodEnd.toISOString().slice(0, 10),
          totalAmount: invoice.totalAmount,
          lineItems: invoice.lineItems.map((item) => ({
            description: item.description,
            quantityHours: item.quantityHours,
            rate: item.rate,
            amount: item.amount,
          })),
        }))}
      />
    </AppShell>
  );
}
