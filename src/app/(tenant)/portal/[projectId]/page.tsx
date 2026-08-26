import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { hasProjectAccess } from "@/tenant/portal/portalAccess";

export const dynamic = "force-dynamic";

export default async function PortalProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const access = await context.tenantDb.projectClientAccess.findMany({
    where: { userId: context.currentUser.id },
    select: { projectId: true },
  });
  if (!hasProjectAccess(access.map((entry) => entry.projectId), projectId)) {
    redirect("/portal");
  }

  const [project, tasks, budgets] = await Promise.all([
    context.tenantDb.project.findUnique({ where: { id: projectId } }),
    context.tenantDb.task.findMany({
      where: { inTriage: false, projects: { some: { projectId, isPrimary: true } } },
      include: { status: true, assignee: true },
      orderBy: { createdAt: "desc" },
    }),
    context.tenantDb.budget.findMany({
      where: { projectId },
      include: { invoices: { where: { status: { in: ["sent", "paid"] } }, orderBy: { createdAt: "desc" } } },
    }),
  ]);

  if (!project) {
    redirect("/portal");
  }

  const invoices = budgets.flatMap((budget) =>
    budget.invoices.map((invoice) => ({ ...invoice, budgetTitle: budget.title })),
  );

  return (
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-6)" }}>{project.name}</h1>

      <h2 style={{ marginBottom: "var(--space-3)" }}>Tasks</h2>
      {tasks.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: "var(--space-8)" }}>
          Keine Tasks.
        </p>
      ) : (
        <div className="table-wrap" style={{ marginBottom: "var(--space-8)" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Zuständig</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{task.status.name}</td>
                  <td className="text-muted">{task.assignee?.name ?? task.assignee?.email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginBottom: "var(--space-3)" }}>Rechnungen</h2>
      {invoices.length === 0 ? (
        <p className="text-muted">Keine Rechnungen.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Budget</th>
                <th>Zeitraum</th>
                <th>Status</th>
                <th className="coord">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.budgetTitle}</td>
                  <td className="coord">
                    {invoice.periodStart.toISOString().slice(0, 10)} – {invoice.periodEnd.toISOString().slice(0, 10)}
                  </td>
                  <td>{invoice.status === "paid" ? "Bezahlt" : "Versendet"}</td>
                  <td className="coord">{invoice.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
