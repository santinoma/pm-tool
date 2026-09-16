import { canViewPrivateTask } from "@/tenant/projectAccess/privateTaskFilter";
import { resolveLinkedTasks } from "@/tenant/taskLinks/taskLinkView";
import { getEffectiveCustomFields } from "@/tenant/customFields/library";
import type { getTenantContext } from "@/tenant/context";

type TenantContext = NonNullable<Awaited<ReturnType<typeof getTenantContext>>>;

export async function loadTaskDetail(context: TenantContext, projectId: string, taskId: string) {
  const currentUser = context.currentUser;
  if (!currentUser) {
    return { notFound: true as const };
  }

  const [task, statuses, users, folders, customFieldDefRecords] = await Promise.all([
    context.tenantDb.task.findUnique({
      where: { id: taskId },
      include: {
        status: true,
        assignee: true,
        parentTask: true,
        recurrenceParent: true,
        subtasks: { include: { status: true, assignee: true }, orderBy: { createdAt: "asc" } },
        blocking: { include: { blockedTask: true } },
        blockedBy: { include: { blockingTask: true } },
        customValues: { include: { field: true } },
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
        attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
        tags: { include: { tag: true } },
        subscribers: { include: { user: true } },
        todos: { include: { assignee: true }, orderBy: { position: "asc" } },
        timeEntries: { include: { user: true }, orderBy: { createdAt: "desc" } },
        activityEvents: {
          where: { type: { not: "comment_added" } },
          include: { actor: true },
          orderBy: { createdAt: "desc" },
          take: 30,
        },
      },
    }),
    context.tenantDb.workflowStatus.findMany({
      where: { workflow: { projects: { some: { id: projectId } } } },
      orderBy: { position: "asc" },
    }),
    context.tenantDb.user.findMany(),
    context.tenantDb.taskFolder.findMany({
      where: { projectId },
      include: { lists: { orderBy: { position: "asc" } } },
      orderBy: { position: "asc" },
    }),
    getEffectiveCustomFields(context.tenantDb, projectId, "task"),
  ]);

  const taskLists = folders.flatMap((folder) =>
    folder.lists.map((list) => ({ id: list.id, label: `${folder.name} / ${list.name}` })),
  );

  if (!task) {
    return { notFound: true as const };
  }
  const isSubscriber = task.subscribers.some((s) => s.userId === currentUser.id);
  if (!canViewPrivateTask(currentUser, task, isSubscriber)) {
    return { notFound: true as const };
  }

  const favorite = await context.tenantDb.favorite.findUnique({
    where: { userId_entityType_entityId: { userId: currentUser.id, entityType: "task", entityId: taskId } },
  });

  const rawLinks = await context.tenantDb.taskLink.findMany({
    where: { OR: [{ sourceTaskId: taskId }, { targetTaskId: taskId }] },
  });
  const resolved = resolveLinkedTasks(rawLinks, taskId);
  const linkedTaskRecords = await context.tenantDb.task.findMany({
    where: { id: { in: resolved.map((entry) => entry.taskId) } },
    include: { status: true, assignee: true, projects: { where: { isPrimary: true }, include: { project: true } } },
  });
  const linkedTaskById = new Map(linkedTaskRecords.map((t) => [t.id, t]));
  const linkedTasks = resolved
    .map((entry) => {
      const linkedTask = linkedTaskById.get(entry.taskId);
      if (!linkedTask) return null;
      return {
        linkId: entry.linkId,
        taskId: linkedTask.id,
        title: linkedTask.title,
        statusName: linkedTask.status.name,
        statusCategory: linkedTask.status.category,
        assigneeLabel: linkedTask.assignee?.name ?? linkedTask.assignee?.email ?? null,
        projectName: linkedTask.projects[0]?.project.name ?? "—",
      };
    })
    .filter((entry) => entry !== null);

  return {
    notFound: false as const,
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      statusId: task.statusId,
      priority: task.priority,
      tShirtSize: task.tShirtSize,
      assigneeId: task.assigneeId,
      taskListGroupId: task.taskListGroupId,
      isKeyTask: task.isKeyTask,
      isPrivate: task.isPrivate,
      isTemplate: task.isTemplate,
      startDate: task.startDate ? task.startDate.toISOString() : null,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      estimatedHours: task.estimatedHours,
      parentTask: task.parentTask ? { id: task.parentTask.id, title: task.parentTask.title } : null,
      recurrence: task.recurrence as { frequency: "daily" | "weekly" | "monthly" | "yearly"; interval: number } | null,
      recurrenceParent: task.recurrenceParent
        ? { id: task.recurrenceParent.id, title: task.recurrenceParent.title }
        : null,
      subtasks: task.subtasks.map((sub) => ({
        id: sub.id,
        title: sub.title,
        statusName: sub.status.name,
        statusCategory: sub.status.category,
        assigneeLabel: sub.assignee?.name ?? sub.assignee?.email ?? null,
      })),
      blocking: task.blocking.map((d) => ({ dependencyId: d.id, id: d.blockedTask.id, title: d.blockedTask.title })),
      blockedBy: task.blockedBy.map((d) => ({ dependencyId: d.id, id: d.blockingTask.id, title: d.blockingTask.title })),
      customValues: task.customValues.map((v) => ({
        fieldId: v.fieldId,
        label: v.field.label,
        type: v.field.type,
        value: v.value,
      })),
      timeEntries: task.timeEntries.map((entry) => ({
        id: entry.id,
        userLabel: entry.user.name ?? entry.user.email,
        durationMinutes: entry.durationMinutes ?? 0,
        description: entry.description,
        createdAt: entry.createdAt.toISOString(),
      })),
      activityEvents: task.activityEvents.map((event) => ({
        id: event.id,
        summary: event.summary,
        actorLabel: event.actor.name ?? event.actor.email,
        createdAt: event.createdAt.toISOString(),
      })),
      comments: task.comments.map((c) => ({
        id: c.id,
        body: c.body,
        author: c.author.name ?? c.author.email,
        createdAt: c.createdAt.toISOString(),
      })),
      attachments: task.attachments.map((a) => ({
        id: a.id,
        filename: a.filename,
        sizeBytes: a.sizeBytes,
        uploadedBy: a.uploadedBy.name ?? a.uploadedBy.email,
      })),
      tags: task.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
      subscribers: task.subscribers.map((s) => ({
        userId: s.user.id,
        label: s.user.name ?? s.user.email,
      })),
      todos: task.todos.map((todo) => ({
        id: todo.id,
        title: todo.title,
        isDone: todo.isDone,
        assigneeId: todo.assigneeId,
        assigneeLabel: todo.assignee?.name ?? todo.assignee?.email ?? null,
      })),
    },
    statuses: statuses.map((s) => ({ id: s.id, name: s.name })),
    users: users.map((u) => ({ id: u.id, label: u.name ?? u.email })),
    customFieldDefs: customFieldDefRecords.map((def) => ({ id: def.id, type: def.type, options: def.options })),
    taskLists,
    isFavorite: favorite !== null,
    linkedTasks,
  };
}

export type TaskDetailData = Awaited<ReturnType<typeof loadTaskDetail>>;
