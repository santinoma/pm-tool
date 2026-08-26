import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { computeProgress } from "@/tenant/reporting/progress";
import { AppShell } from "@/ui/shell/AppShell";

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
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <div className="container" style={{ maxWidth: "700px" }}>
        <h1 style={{ marginBottom: "var(--space-6)" }}>Projekt-Fortschritt</h1>

        {rows.length === 0 ? (
          <div className="empty-state">
            <h3>Noch keine Projekte</h3>
          </div>
        ) : (
          <div className="card">
            {rows.map((row) => (
              <div className="scale-row" key={row.projectId}>
                <div className="scale-row-labels">
                  <span>{row.projectName}</span>
                  <span className="coord">
                    {row.percent}% · {row.done}/{row.total}
                  </span>
                </div>
                <div className="scale-bar">
                  <div className="scale-bar-fill" style={{ width: `${row.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
