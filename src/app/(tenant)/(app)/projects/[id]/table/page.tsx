import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { privateTaskVisibilityFilter } from "@/tenant/projectAccess/privateTaskFilter";
import { getOrCreateSystemTaskFields } from "@/tenant/customFields/systemTaskFields";
import { TableViewClient } from "./TableViewClient";

export const dynamic = "force-dynamic";

// Reference "Table Layout": a flat, ungrouped spreadsheet of every task with
// inline-editable cells — distinct from List, which groups by status/task list.
export default async function TableViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const { priorityField, tShirtSizeField } = await getOrCreateSystemTaskFields(context.tenantDb);

  const [tasks, statuses, users] = await Promise.all([
    context.tenantDb.task.findMany({
      where: {
        AND: [
          { inTriage: false, projects: { some: { projectId: id } } },
          privateTaskVisibilityFilter(context.currentUser),
        ],
      },
      include: {
        status: true,
        assignee: true,
        customValues: { where: { fieldId: { in: [priorityField.id, tShirtSizeField.id] } } },
      },
      orderBy: { position: "asc" },
    }),
    context.tenantDb.workflowStatus.findMany({
      where: { workflow: { projects: { some: { id } } } },
      orderBy: { position: "asc" },
    }),
    context.tenantDb.user.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <TableViewClient
      projectId={id}
      priorityFieldId={priorityField.id}
      priorityOptions={priorityField.options}
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        statusId: task.statusId,
        statusName: task.status.name,
        statusCategory: task.status.category,
        assigneeId: task.assigneeId,
        assignee: task.assignee?.name ?? task.assignee?.email ?? null,
        priority: task.customValues.find((v) => v.fieldId === priorityField.id)?.value ?? "",
        tShirtSize: task.customValues.find((v) => v.fieldId === tShirtSizeField.id)?.value ?? null,
        estimatedHours: task.estimatedHours,
        startDate: task.startDate ? task.startDate.toISOString() : null,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        isKeyTask: task.isKeyTask,
        isPrivate: task.isPrivate,
      }))}
      statuses={statuses.map((status) => ({ id: status.id, name: status.name, category: status.category }))}
      users={users.map((user) => ({ id: user.id, label: user.name ?? user.email }))}
    />
  );
}
