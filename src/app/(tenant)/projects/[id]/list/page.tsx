import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { ListClient } from "./ListClient";
import { SharedViewsPanel } from "./SharedViewsPanel";

export const dynamic = "force-dynamic";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const canManage = canManageMembers(context.currentUser.role);
  const [tasks, sharedViews] = await Promise.all([
    context.tenantDb.task.findMany({
      where: { inTriage: false, projects: { some: { projectId: id } } },
      include: { status: true, assignee: true },
      orderBy: { createdAt: "desc" },
    }),
    canManage
      ? context.tenantDb.sharedView.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
  ]);

  return (
    <>
      {canManage && (
        <SharedViewsPanel
          projectId={id}
          views={sharedViews.map((view) => ({
            id: view.id,
            token: view.token,
            statusCategoryFilter: view.statusCategoryFilter,
            expiresAt: view.expiresAt ? view.expiresAt.toISOString() : null,
            revokedAt: view.revokedAt ? view.revokedAt.toISOString() : null,
          }))}
        />
      )}
      <ListClient
        projectId={id}
        tasks={tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status.name,
          statusCategory: task.status.category,
          assignee: task.assignee?.name ?? task.assignee?.email ?? null,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        }))}
      />
    </>
  );
}
