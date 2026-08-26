import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { HillChartClient } from "./HillChartClient";

export const dynamic = "force-dynamic";

export default async function HillChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const tasks = await context.tenantDb.task.findMany({
    where: {
      inTriage: false,
      hillPosition: { not: null },
      projects: { some: { projectId: id, isPrimary: true } },
      status: { category: { not: "done" } },
    },
    select: { id: true, title: true, hillPosition: true },
  });

  return (
    <HillChartClient
      tasks={tasks.map((task) => ({ id: task.id, title: task.title, hillPosition: task.hillPosition! }))}
    />
  );
}
