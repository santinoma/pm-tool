import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { computeProgress } from "@/tenant/reporting/progress";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { Progress } from "@/ui/shadcn/components/progress";

export const dynamic = "force-dynamic";

export default async function ProgressReportPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const projects = await context.tenantDb.project.findMany({
    include: { taskLinks: { where: { isPrimary: true }, include: { task: { include: { status: true } } } } },
    orderBy: { name: "asc" },
  });

  const rows = projects.map((project) => {
    const tasks = project.taskLinks
      .map((link) => link.task)
      .filter((task) => !task.inTriage)
      .map((task) => ({ statusCategory: task.status.category }));
    return { projectId: project.id, projectName: project.name, ...computeProgress(tasks) };
  });

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Fortschritt"
    >
      <div className="mx-auto max-w-2xl pb-10">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Projekt-Fortschritt</h1>

        {rows.length === 0 ? (
          <div className="rounded-lg border py-14 text-center">
            <h3 className="font-semibold">Noch keine Projekte</h3>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-lg border p-5">
            {rows.map((row) => (
              <div key={row.projectId} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{row.projectName}</span>
                  <span className="text-muted-foreground">
                    {row.percent}% · {row.done}/{row.total}
                  </span>
                </div>
                <Progress value={row.percent} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShellNextElite>
  );
}
