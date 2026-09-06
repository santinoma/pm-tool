import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { MyTasksClient } from "./MyTasksClient";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [tasks, savedViews] = await Promise.all([
    context.tenantDb.task.findMany({
      where: { inTriage: false, assigneeId: context.currentUser.id },
      include: {
        status: true,
        projects: { where: { isPrimary: true }, include: { project: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    context.tenantDb.savedView.findMany({
      where: { scope: "my_tasks", ownerId: context.currentUser.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Meine Tasks"
    >
      <MyTasksClient
        tasks={tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status.name,
          statusCategory: task.status.category,
          projectId: task.projects[0]?.project.id ?? null,
          projectName: task.projects[0]?.project.name ?? "—",
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        }))}
        savedViews={savedViews.map((view) => ({
          id: view.id,
          name: view.name,
          viewType: view.viewType,
          filterConfig: view.filterConfig as Record<string, unknown>,
          sortConfig: (view.sortConfig as Record<string, unknown> | null) ?? null,
          sharedWithAll: view.sharedWithAll,
          ownerId: view.ownerId,
        }))}
        currentUserId={context.currentUser.id}
      />
    </AppShellNextElite>
  );
}
