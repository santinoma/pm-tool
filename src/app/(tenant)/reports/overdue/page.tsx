import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { computeOverdueTasks } from "@/tenant/reporting/overdue";
import { AppShell } from "@/ui/shell/AppShell";

export const dynamic = "force-dynamic";

export default async function OverdueReportPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const now = new Date();
  const tasks = await context.tenantDb.task.findMany({
    where: { inTriage: false },
    include: {
      status: true,
      assignee: true,
      projects: { where: { isPrimary: true }, include: { project: true } },
    },
  });

  const overdue = computeOverdueTasks(
    tasks.map((task) => ({ id: task.id, dueDate: task.dueDate, statusCategory: task.status.category })),
    now,
  );
  const overdueIds = new Set(overdue.map((task) => task.id));
  const rows = tasks.filter((task) => overdueIds.has(task.id));

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <div className="container" style={{ maxWidth: "860px" }}>
        <h1 style={{ marginBottom: "var(--space-1)" }}>Überfällige Tasks</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
          Cross-projekt, alle noch nicht erledigten Tasks mit vergangener Fälligkeit.
        </p>

        {rows.length === 0 ? (
          <div className="empty-state">
            <h3>Keine überfälligen Tasks</h3>
            <p>Alle fälligen Arbeiten sind im Zeitplan.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Projekt</th>
                  <th>Assignee</th>
                  <th style={{ textAlign: "right" }}>Fällig</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((task) => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td className="text-muted">{task.projects[0]?.project.name ?? "—"}</td>
                    <td className="text-muted">{task.assignee?.name ?? task.assignee?.email ?? "—"}</td>
                    <td className="coord" style={{ textAlign: "right" }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString("de-DE") : "—"}
                    </td>
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
