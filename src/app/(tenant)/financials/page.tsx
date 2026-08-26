import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShell } from "@/ui/shell/AppShell";

export const dynamic = "force-dynamic";

export default async function FinancialsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const projects = await context.tenantDb.project.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { budgets: true } } },
  });

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <div className="container">
        <h1 style={{ marginBottom: "var(--space-1)" }}>Financials</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
          Wähle ein Projekt, um dessen Budgets zu verwalten.
        </p>

        {projects.length === 0 ? (
          <div className="empty-state">
            <h3>Noch keine Projekte</h3>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Projekt</th>
                  <th>Budgets</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link href={`/financials/${project.id}`} style={{ fontWeight: 600 }}>
                        {project.name}
                      </Link>
                    </td>
                    <td className="coord">{project._count.budgets}</td>
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
