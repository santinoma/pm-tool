import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { TaskListsEditorClient } from "./TaskListsEditorClient";

export const dynamic = "force-dynamic";

export default async function TaskListsSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  // T404.1: die Settings-Seite ist der einzige Ort, an dem auch archivierte
  // Ordner/Listen geladen werden (zum Wiederherstellen) — alle anderen
  // Ansichten (Listen-Ansicht, Task-Detail-Picker, GET /api/tenant/task-folders)
  // blenden archivierte Einträge aus.
  const folders = await context.tenantDb.taskFolder.findMany({
    where: { projectId: id },
    include: { lists: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });

  return (
    <TaskListsEditorClient
      projectId={id}
      canManage={canManageMembers(context.currentUser.role)}
      folders={folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        position: folder.position,
        archived: folder.archived,
        lists: folder.lists.map((list) => ({ id: list.id, name: list.name, position: list.position, archived: list.archived })),
      }))}
    />
  );
}
