import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { runDueTimeAutomationRules } from "@/tenant/automations/scheduleDueCheck";
import type { FilterGroup } from "@/tenant/views/filterEngine";
import { AutomationsClient } from "./AutomationsClient";

export const dynamic = "force-dynamic";

export default async function AutomationsSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  // Zusätzlich zum echten Hintergrund-Scheduler (T307, siehe instrumentation.ts)
  // hier nochmal ausgelöst, rein als Sicherheitsnetz — idempotent über
  // `lastRunPeriodKey`, löst also nichts doppelt aus, falls der Scheduler-
  // Prozess zwischenzeitlich neu gestartet wurde.
  await runDueTimeAutomationRules(context.tenantDb, new Date());

  const [rules, users, statuses, projects] = await Promise.all([
    context.tenantDb.automationRule.findMany({
      include: {
        actions: { include: { targetUser: true, targetStatus: true }, orderBy: { position: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    context.tenantDb.user.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    context.tenantDb.workflowStatus.findMany({ include: { workflow: true }, orderBy: { name: "asc" } }),
    context.tenantDb.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Automations"
    >
      <AutomationsClient
        canManage={canManageMembers(context.currentUser.role)}
        users={users.map((user) => ({ id: user.id, label: user.name ?? user.email }))}
        statuses={statuses.map((status) => ({ id: status.id, label: `${status.workflow.name}: ${status.name}` }))}
        projects={projects.map((project) => ({ id: project.id, label: project.name }))}
        rules={rules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          triggers: rule.triggers,
          conditionConfig: rule.conditionConfig as FilterGroup | null,
          scheduleTime: rule.scheduleTime,
          scheduleWeekday: rule.scheduleWeekday,
          isEnabled: rule.isEnabled,
          projectIds: rule.projectIds,
          // send_email ist bewusst nicht in der UI abgebildet — siehe
          // AutomationsClient.tsx: keine echte E-Mail-Infrastruktur vorhanden,
          // die Aktion bleibt ein dokumentiertes Backend-No-Op.
          actions: rule.actions
            .filter((action) => action.type !== "send_email")
            .map((action) => ({
              type: action.type as Exclude<typeof action.type, "send_email">,
              targetUserLabel: action.targetUser ? (action.targetUser.name ?? action.targetUser.email) : null,
              targetStatusLabel: action.targetStatus?.name ?? null,
              commentBody: action.commentBody,
              newItemTitle: action.newItemTitle,
            })),
        }))}
      />
    </AppShellNextElite>
  );
}
