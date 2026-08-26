import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShell } from "@/ui/shell/AppShell";
import { MyTasksClient } from "./MyTasksClient";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const tasks = await context.tenantDb.task.findMany({
    where: { inTriage: false, assigneeId: context.currentUser.id },
    include: {
      status: true,
      projects: { where: { isPrimary: true }, include: { project: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
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
      />
    </AppShell>
  );
}
