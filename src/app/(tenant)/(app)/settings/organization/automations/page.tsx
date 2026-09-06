import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { runDueTimeAutomationRules } from "@/tenant/automations/scheduleDueCheck";
import { AutomationsClient } from "./AutomationsClient";

export const dynamic = "force-dynamic";

export default async function AutomationsSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  // Pull-basierter Trigger für fällige time_daily/time_weekly-Regeln (dasselbe
  // Muster wie die automatischen Check-ins): beim Besuch der Automations-
  // Einstellungsseite werden alle fälligen zeitbasierten Regeln als
  // Massenausführung gegen ihre passenden Tasks gefahren, bevor die Liste
  // geladen wird — kein separater Cron nötig.
  await runDueTimeAutomationRules(context.tenantDb, new Date(), context.currentUser.id);

  const [rules, users, statuses, projects] = await Promise.all([
    context.tenantDb.automationRule.findMany({
      include: {
        actions: { include: { targetUser: true, targetStatus: true }, orderBy: { position: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    context.tenantDb.user.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    context.tenantDb.workflowStatus.findMany({ include: { project: true }, orderBy: { name: "asc" } }),
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
        statuses={statuses.map((status) => ({ id: status.id, label: `${status.project.name}: ${status.name}` }))}
        projects={projects.map((project) => ({ id: project.id, label: project.name }))}
        rules={rules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          triggers: rule.triggers,
          conditionStatusCategory: rule.conditionStatusCategory,
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
