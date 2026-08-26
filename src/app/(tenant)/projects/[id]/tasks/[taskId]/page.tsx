import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { resolveLinkedTasks } from "@/tenant/taskLinks/taskLinkView";
import { TaskDetailClient } from "./TaskDetailClient";
import { TaskLinksPanel } from "./TaskLinksPanel";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id, taskId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [task, statuses, users] = await Promise.all([
    context.tenantDb.task.findUnique({
      where: { id: taskId },
      include: {
        status: true,
        assignee: true,
        blocking: { include: { blockedTask: true } },
        blockedBy: { include: { blockingTask: true } },
        customValues: { include: { field: true } },
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
        attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    context.tenantDb.workflowStatus.findMany({ where: { projectId: id }, orderBy: { position: "asc" } }),
    context.tenantDb.user.findMany(),
  ]);

  if (!task) {
    redirect(`/projects/${id}/list`);
  }

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

  return (
    <>
      <TaskDetailClient
        task={{
        id: task.id,
        title: task.title,
        description: task.description,
        statusId: task.statusId,
        assigneeId: task.assigneeId,
        blocking: task.blocking.map((d) => ({ id: d.blockedTask.id, title: d.blockedTask.title })),
        blockedBy: task.blockedBy.map((d) => ({ id: d.blockingTask.id, title: d.blockingTask.title })),
        customValues: task.customValues.map((v) => ({
          fieldId: v.fieldId,
          label: v.field.label,
          value: v.value,
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
      }}
      statuses={statuses.map((s) => ({ id: s.id, name: s.name }))}
      users={users.map((u) => ({ id: u.id, label: u.name ?? u.email }))}
      />
      <TaskLinksPanel taskId={taskId} links={linkedTasks} />
    </>
  );
}
