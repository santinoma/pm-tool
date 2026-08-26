import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { TriageClient } from "./TriageClient";

export const dynamic = "force-dynamic";

export default async function TriagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const tasks = await context.tenantDb.task.findMany({
    where: { inTriage: true, projects: { some: { projectId: id, isPrimary: true } } },
    orderBy: { createdAt: "asc" },
  });
  const defaultStatus = await context.tenantDb.workflowStatus.findFirst({
    where: { projectId: id, isDefault: true },
  });

  return (
    <TriageClient
      projectId={id}
      defaultStatusId={defaultStatus?.id ?? ""}
      tasks={tasks.map((task) => ({ id: task.id, title: task.title }))}
    />
  );
}
