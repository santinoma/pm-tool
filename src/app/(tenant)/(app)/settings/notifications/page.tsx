import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { NotificationSettingsClient } from "./NotificationSettingsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  const userId = context.currentUser.id;

  const [memberships, preferences] = await Promise.all([
    context.tenantDb.projectMember.findMany({
      where: { userId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { project: { name: "asc" } },
    }),
    context.tenantDb.notificationPreference.findMany({ where: { userId } }),
  ]);
  const levelByProjectId = new Map(preferences.map((pref) => [pref.projectId, pref.level]));

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Notifications"
    >
      <NotificationSettingsClient
        projects={memberships.map((membership) => ({
          id: membership.project.id,
          name: membership.project.name,
          level: levelByProjectId.get(membership.project.id) ?? "all",
        }))}
      />
    </AppShellNextElite>
  );
}
