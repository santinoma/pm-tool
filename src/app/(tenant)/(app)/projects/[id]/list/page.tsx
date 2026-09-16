import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { privateTaskVisibilityFilter } from "@/tenant/projectAccess/privateTaskFilter";
import { getEffectiveCustomFields } from "@/tenant/customFields/library";
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
  const [tasks, sharedViews, statuses, users, customFields, folders, savedViews, templates] = await Promise.all([
    context.tenantDb.task.findMany({
      where: {
        AND: [
          { inTriage: false, projects: { some: { projectId: id } } },
          privateTaskVisibilityFilter(context.currentUser),
        ],
      },
      include: { status: true, assignee: true },
      orderBy: { position: "asc" },
    }),
    canManage
      ? context.tenantDb.sharedView.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
    context.tenantDb.workflowStatus.findMany({
      where: { workflow: { projects: { some: { id } } } },
      orderBy: { position: "asc" },
    }),
    context.tenantDb.user.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    getEffectiveCustomFields(context.tenantDb, id, "task"),
    context.tenantDb.taskFolder.findMany({
      where: { projectId: id },
      include: { lists: { orderBy: { position: "asc" } } },
      orderBy: { position: "asc" },
    }),
    context.tenantDb.savedView.findMany({
      where: {
        scope: "project",
        projectId: id,
        OR: [{ ownerId: context.currentUser.id }, { sharedWithAll: true }],
      },
      orderBy: { createdAt: "desc" },
    }),
    context.tenantDb.task.findMany({
      where: { isTemplate: true, projects: { some: { projectId: id } } },
      orderBy: { title: "asc" },
    }),
  ]);

  const taskLists = folders.flatMap((folder) =>
    folder.lists.map((list) => ({ id: list.id, label: `${folder.name} / ${list.name}` })),
  );

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
          startDate: task.startDate ? task.startDate.toISOString() : null,
          priority: task.priority,
          isKeyTask: task.isKeyTask,
          isPrivate: task.isPrivate,
          taskListGroupId: task.taskListGroupId,
        }))}
        statuses={statuses.map((status) => ({ id: status.id, name: status.name }))}
        users={users.map((user) => ({ id: user.id, label: user.name ?? user.email }))}
        customFields={customFields.map((field) => ({
          id: field.id,
          label: field.label,
          type: field.type,
          options: field.options,
        }))}
        templates={templates.map((template) => ({ id: template.id, title: template.title }))}
        taskLists={taskLists}
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
    </>
  );
}
