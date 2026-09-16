import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { hasProjectMemberAccess } from "@/tenant/projectAccess/resolveProjectMembership";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { BudgetDetailClient } from "./BudgetDetailClient";
import { InvoicesClient } from "./InvoicesClient";
import { RetainerBurnPanel } from "./RetainerBurnPanel";
import { computeCurrentPeriod } from "@/tenant/retainer/period";
import { computeSectionBurn } from "@/tenant/retainer/burn";
import { getEffectiveRateCardItems } from "@/tenant/financials/rateCards";
import { getEffectiveCustomFields } from "@/tenant/customFields/library";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

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
  if (!(await hasProjectMemberAccess(context.tenantDb, context.currentUser, projectId))) {
    redirect("/financials");
  }

  const project = await context.tenantDb.project.findUnique({ where: { id: projectId }, select: { clientId: true } });

  const [budget, users, invoices, serviceTypes, rateCardItems, customFieldDefs, scenarios, feedEvents, timeEntries, approvalPolicies] =
    await Promise.all([
      context.tenantDb.budget.findUnique({
        where: { id: budgetId },
        include: {
          owner: true,
          scenarioOf: { select: { id: true, title: true } },
          sections: {
            include: { assignees: { include: { user: true } }, serviceType: true },
            orderBy: { position: "asc" },
          },
          customFieldValues: { include: { field: true } },
        },
      }),
      context.tenantDb.user.findMany({ orderBy: { email: "asc" } }),
      context.tenantDb.invoice.findMany({
        where: { budgetId },
        include: { lineItems: true, payments: true, creditNotes: true },
        orderBy: { createdAt: "desc" },
      }),
      context.tenantDb.serviceType.findMany({ orderBy: { name: "asc" } }),
      getEffectiveRateCardItems(context.tenantDb, project?.clientId ?? null),
      getEffectiveCustomFields(context.tenantDb, projectId, "budget"),
      context.tenantDb.budget.findMany({
        where: { scenarioOfId: budgetId },
        include: { owner: true, sections: true },
        orderBy: { createdAt: "desc" },
      }),
      context.tenantDb.activityEvent.findMany({
        where: { budgetId },
        include: { actor: true },
        orderBy: { createdAt: "desc" },
      }),
      context.tenantDb.timeEntry.findMany({
        where: { budgetSection: { budgetId } },
        include: { user: true, budgetSection: true },
        orderBy: { createdAt: "desc" },
      }),
      context.tenantDb.approvalPolicy.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);

  if (!budget || budget.projectId !== projectId) {
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

  const canManage = canManageMembers(context.currentUser.role);
  const canViewSensitiveFields = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "employee_fields_sensitive_view",
  );
  // Sensible Felder werden nur an Personen mit der entsprechenden Berechtigung
  // ausgeliefert — sie fehlen für alle anderen komplett, statt nur verschleiert
  // angezeigt zu werden.
  const visibleCustomFieldDefs = customFieldDefs.filter((field) => !field.sensitive || canViewSensitiveFields);
  const visibleFieldIds = new Set(visibleCustomFieldDefs.map((field) => field.id));

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle={budget.title}
    >
      <BudgetDetailClient
        projectId={projectId}
        canManage={canManage}
        budget={{
          id: budget.id,
          title: budget.title,
          ownerLabel: budget.owner.name ?? budget.owner.email,
          ownerId: budget.ownerId,
          startDate: budget.startDate ? budget.startDate.toISOString().slice(0, 10) : null,
          endDate: budget.endDate ? budget.endDate.toISOString().slice(0, 10) : null,
          color: budget.color,
          isScenario: budget.isScenario,
          isTemplate: budget.isTemplate,
          scenarioOf: budget.scenarioOf,
          deliveredAt: budget.deliveredAt ? budget.deliveredAt.toISOString() : null,
          approvalPolicyId: budget.approvalPolicyId,
        }}
        approvalPolicies={approvalPolicies.map((policy) => ({ id: policy.id, name: policy.name }))}
        sections={budget.sections.map((section) => ({
          id: section.id,
          name: section.name,
          description: section.description,
          budgetedTimeHours: section.budgetedTimeHours,
          estimatedCost: section.estimatedCost,
          quantity: section.quantity,
          price: section.price,
          budgetUsed: section.budgetUsed,
          serviceTypeId: section.serviceTypeId,
          billingType: section.billingType,
          trackingUnit: section.trackingUnit,
          recognitionMethod: section.recognitionMethod,
          discountPercent: section.discountPercent,
          markupPercent: section.markupPercent,
          guaranteedMaxPrice: section.guaranteedMaxPrice,
          warningThresholdPercent: section.warningThresholdPercent,
          blockOverrun: section.blockOverrun,
          trackTime: section.trackTime,
          trackExpenses: section.trackExpenses,
          trackBooking: section.trackBooking,
          position: section.position,
          assigneeIds: section.assignees.map((a) => a.userId),
          assigneeLabels: section.assignees.map((a) => a.user.name ?? a.user.email),
        }))}
        users={users.map((u) => ({ id: u.id, label: u.name ?? u.email }))}
        serviceTypes={serviceTypes.map((type) => ({ id: type.id, name: type.name }))}
        rateCardItems={rateCardItems.map(({ source, item }) => ({
          id: item.id,
          source,
          name: item.name,
          serviceTypeId: item.serviceTypeId,
          billingType: item.billingType,
          trackingUnit: item.trackingUnit,
          defaultPrice: item.defaultPrice,
        }))}
        customFieldDefs={visibleCustomFieldDefs.map((field) => ({
          id: field.id,
          key: field.key,
          label: field.label,
          type: field.type,
          options: field.options,
        }))}
        customFieldValues={budget.customFieldValues
          .filter((value) => visibleFieldIds.has(value.fieldId))
          .map((value) => ({ fieldId: value.fieldId, value: value.value }))}
        scenarios={scenarios.map((scenario) => ({
          id: scenario.id,
          title: scenario.title,
          ownerLabel: scenario.owner.name ?? scenario.owner.email,
          sectionCount: scenario.sections.length,
        }))}
        feedEvents={feedEvents.map((event) => ({
          id: event.id,
          type: event.type,
          summary: event.summary,
          actorLabel: event.actor.name ?? event.actor.email,
          createdAt: event.createdAt.toISOString(),
        }))}
        timeEntries={timeEntries.map((entry) => ({
          id: entry.id,
          userLabel: entry.user.name ?? entry.user.email,
          sectionName: entry.budgetSection?.name ?? "—",
          description: entry.description,
          durationMinutes: entry.durationMinutes,
          amount: entry.amount,
          createdAt: entry.createdAt.toISOString(),
        }))}
        invoicesTab={
          <InvoicesClient
            budgetId={budget.id}
            canManage={canManage}
            invoices={invoices.map((invoice) => ({
              id: invoice.id,
              status: invoice.status,
              invoicingMethod: invoice.invoicingMethod,
              periodStart: invoice.periodStart.toISOString().slice(0, 10),
              periodEnd: invoice.periodEnd.toISOString().slice(0, 10),
              totalAmount: invoice.totalAmount,
              paidAmount: invoice.paidAmount,
              finalizedAt: invoice.finalizedAt ? invoice.finalizedAt.toISOString() : null,
              lineItems: invoice.lineItems.map((item) => ({
                description: item.description,
                quantityHours: item.quantityHours,
                rate: item.rate,
                amount: item.amount,
                taxRatePercent: item.taxRatePercent,
              })),
              payments: invoice.payments.map((payment) => ({
                id: payment.id,
                amount: payment.amount,
                paidAt: payment.paidAt.toISOString().slice(0, 10),
                note: payment.note,
              })),
              creditNotes: invoice.creditNotes.map((note) => ({
                id: note.id,
                amount: note.amount,
                reason: note.reason,
              })),
            }))}
          />
        }
        retainerBurnTab={retainerBurn && <RetainerBurnPanel {...retainerBurn} />}
      />
    </AppShellNextElite>
  );
}
