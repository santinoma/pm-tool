import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { NotificationsClient } from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [notifications, projects, preferences] = await Promise.all([
    context.tenantDb.notification.findMany({
      where: { userId: context.currentUser.id },
      include: { activityEvent: { include: { actor: true, project: true } } },
      orderBy: { createdAt: "desc" },
    }),
    context.tenantDb.project.findMany({ orderBy: { name: "asc" } }),
    context.tenantDb.notificationPreference.findMany({
      where: { userId: context.currentUser.id },
    }),
  ]);

  const preferenceByProjectId = new Map(preferences.map((pref) => [pref.projectId, pref.level]));

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Benachrichtigungen"
    >
      <NotificationsClient
        notifications={notifications.map((n) => ({
          id: n.id,
          summary: n.activityEvent.summary,
          projectName: n.activityEvent.project.name,
          actor: n.activityEvent.actor.name ?? n.activityEvent.actor.email,
          createdAt: n.createdAt.toISOString(),
          readAt: n.readAt ? n.readAt.toISOString() : null,
        }))}
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          level: preferenceByProjectId.get(project.id) ?? "all",
        }))}
      />
    </AppShellNextElite>
  );
}
