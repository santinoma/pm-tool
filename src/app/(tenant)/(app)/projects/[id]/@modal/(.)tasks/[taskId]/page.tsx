import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { loadTaskDetail } from "../../../tasks/[taskId]/loadTaskDetail";
import { TaskDetailClient } from "../../../tasks/[taskId]/TaskDetailClient";
import { TaskSlideOver } from "@/ui/nextelite/TaskSlideOver";

export const dynamic = "force-dynamic";

export default async function TaskDetailModal({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id, taskId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const data = await loadTaskDetail(context, id, taskId);
  if (data.notFound) {
    redirect(`/projects/${id}/list`);
  }

  return (
    <TaskSlideOver>
      <TaskDetailClient
        projectId={id}
        task={data.task}
        statuses={data.statuses}
        users={data.users}
        customFieldDefs={data.customFieldDefs}
        taskLists={data.taskLists}
        isFavorite={data.isFavorite}
        currentUserId={context.currentUser.id}
        linkedTasks={data.linkedTasks}
      />
    </TaskSlideOver>
  );
}
