import { getTenantContext } from "@/tenant/context";
import { isSharedViewValid } from "@/tenant/sharedViews/sharedViewAccess";

export const dynamic = "force-dynamic";

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="container" style={{ maxWidth: "480px", textAlign: "center", paddingTop: "var(--space-16)" }}>
      <h1 style={{ marginBottom: "var(--space-3)" }}>Link nicht verfügbar</h1>
      <p className="text-muted">{message}</p>
    </div>
  );
}

export default async function SharedViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const context = await getTenantContext();
  if (!context) {
    return <ErrorPage message="Unbekannter Tenant." />;
  }

  const view = await context.tenantDb.sharedView.findUnique({
    where: { token },
    include: { project: true },
  });
  if (!view) {
    return <ErrorPage message="Dieser Link existiert nicht." />;
  }

  const validation = isSharedViewValid(view);
  if (!validation.valid) {
    return (
      <ErrorPage
        message={validation.reason === "revoked" ? "Dieser Link wurde widerrufen." : "Dieser Link ist abgelaufen."}
      />
    );
  }

  const tasks = await context.tenantDb.task.findMany({
    where: {
      inTriage: false,
      projects: { some: { projectId: view.projectId } },
      status: view.statusCategoryFilter ? { category: view.statusCategoryFilter } : undefined,
    },
    include: { status: true, assignee: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container">
      <div className="text-faint coord" style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-1)" }}>
        Freigegebene Ansicht
      </div>
      <h1 style={{ marginBottom: "var(--space-6)" }}>{view.project.name}</h1>

      {tasks.length === 0 ? (
        <p className="text-muted">Keine Tasks.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Zuständig</th>
                <th>Fällig</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{task.status.name}</td>
                  <td className="text-muted">{task.assignee?.name ?? task.assignee?.email ?? "—"}</td>
                  <td className="coord">{task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
