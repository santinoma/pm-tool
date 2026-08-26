import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { computeProgress } from "@/tenant/reporting/progress";
import { AppShell } from "@/ui/shell/AppShell";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const projects = await context.tenantDb.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { taskLinks: true } },
      taskLinks: { where: { isPrimary: true }, include: { task: { include: { status: true } } } },
    },
  });

  const rows = projects.map((project) => {
    const tasks = project.taskLinks
      .map((link) => link.task)
      .filter((task) => !task.inTriage)
      .map((task) => ({ statusCategory: task.status.category }));
    return { project, progress: computeProgress(tasks) };
  });

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <div className="container">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
          <div>
            <h1>Projekte</h1>
            <p className="text-muted" style={{ marginTop: "var(--space-1)" }}>
              Der Index aller Projekte in diesem Workspace.
            </p>
          </div>
          <Link href="/projects/new" className="btn btn-primary">
            Neues Projekt
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">
            <h3>Noch keine Projekte angelegt</h3>
            <p>Leg dein erstes Projekt an, um Tasks zu verfolgen.</p>
            <Link href="/projects/new" className="btn btn-primary">
              Neues Projekt
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Projekt</th>
                  <th>Tasks</th>
                  <th>Fortschritt</th>
                  <th>Angelegt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ project, progress }) => (
                  <tr key={project.id}>
                    <td>
                      <Link href={`/projects/${project.id}/list`} style={{ fontWeight: 600 }}>
                        {project.name}
                      </Link>
                    </td>
                    <td className="coord">{project._count.taskLinks}</td>
                    <td>
                      <div className="row" style={{ gap: "var(--space-2)" }}>
                        <div className="scale-bar" style={{ width: "80px" }}>
                          <div className="scale-bar-fill" style={{ width: `${progress.percent}%` }} />
                        </div>
                        <span className="coord">{progress.percent}%</span>
                      </div>
                    </td>
                    <td className="text-muted">{project.createdAt.toLocaleDateString("de-DE")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
