import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { privateTaskVisibilityFilter } from "@/tenant/projectAccess/privateTaskFilter";
import { getEffectiveCustomFields } from "@/tenant/customFields/library";
import { BoardClient } from "./BoardClient";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [statuses, tasks, users, customFields, templates] = await Promise.all([
    context.tenantDb.workflowStatus.findMany({
      where: { workflow: { projects: { some: { id } } } },
      orderBy: { position: "asc" },
    }),
    context.tenantDb.task.findMany({
      where: {
        AND: [
          { inTriage: false, projects: { some: { projectId: id } } },
          privateTaskVisibilityFilter(context.currentUser),
        ],
      },
      include: { assignee: true },
      orderBy: { position: "asc" },
    }),
    context.tenantDb.user.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    getEffectiveCustomFields(context.tenantDb, id, "task"),
    context.tenantDb.task.findMany({
      where: { isTemplate: true, projects: { some: { projectId: id } } },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <BoardClient
      projectId={id}
      statuses={statuses.map((status) => ({ id: status.id, name: status.name, category: status.category }))}
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        statusId: task.statusId,
        position: task.position,
        assignee: task.assignee?.name ?? task.assignee?.email ?? null,
        priority: task.priority,
        tShirtSize: task.tShirtSize,
        estimatedHours: task.estimatedHours,
      }))}
      users={users.map((user) => ({ id: user.id, label: user.name ?? user.email }))}
      customFields={customFields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        options: field.options,
      }))}
      templates={templates.map((template) => ({ id: template.id, title: template.title }))}
    />
  );
}
