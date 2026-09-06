import type { PrismaClient } from "../../generated/tenant-client/client.js";

/**
 * Lädt eine Vorlagen-Task und stellt sicher, dass sie tatsächlich als Vorlage markiert ist
 * und zum angegebenen Projekt gehört. Gibt `null` zurück, wenn keine passende Vorlage
 * existiert (Aufrufer antwortet dann mit 404).
 */
export async function resolveTaskTemplate(tenantDb: PrismaClient, templateTaskId: string, projectId: string) {
  return tenantDb.task.findFirst({
    where: { id: templateTaskId, isTemplate: true, projects: { some: { projectId } } },
  });
}

/**
 * Kopiert die Inhalte einer Vorlagen-Task (Custom-Field-Werte, Subtasks, Todos) auf eine
 * neu angelegte Task. Status, Assignee, Termine, Kommentare, Anhänge, Tags und Subscriber
 * sind bewusst instanzspezifisch und werden NICHT kopiert.
 */
export async function applyTaskTemplateContent(
  tenantDb: PrismaClient,
  params: { templateTaskId: string; newTaskId: string; projectId: string; defaultStatusId: string },
) {
  const { templateTaskId, newTaskId, projectId, defaultStatusId } = params;

  const [customValues, subtasks, todos] = await Promise.all([
    tenantDb.customFieldValue.findMany({ where: { taskId: templateTaskId }, select: { fieldId: true, value: true } }),
    tenantDb.task.findMany({ where: { parentTaskId: templateTaskId }, select: { title: true } }),
    tenantDb.todo.findMany({ where: { taskId: templateTaskId }, select: { title: true } }),
  ]);

  await Promise.all([
    ...customValues.map((value) =>
      tenantDb.customFieldValue.create({
        data: { fieldId: value.fieldId, taskId: newTaskId, value: value.value },
      }),
    ),
    ...subtasks.map((subtask) =>
      tenantDb.task.create({
        data: {
          title: subtask.title,
          statusId: defaultStatusId,
          parentTaskId: newTaskId,
          projects: { create: { projectId, isPrimary: true } },
        },
      }),
    ),
    ...todos.map((todo) =>
      tenantDb.todo.create({
        data: { taskId: newTaskId, title: todo.title, isDone: false },
      }),
    ),
  ]);
}
