import Link from "next/link";
import { listTenants } from "@/platform/tenantRegistry";
import { AdminShell } from "@/ui/shell/AdminShell";
import { LegendKey } from "@/ui/components/LegendKey";
import { DeleteTenantButton } from "./DeleteTenantButton";
import { ToggleTenantStatusButton } from "./ToggleTenantStatusButton";

const PLAN_LABELS: Record<string, string> = {
  small: "Klein",
  medium: "Mittelstand",
  enterprise: "Enterprise",
};

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const tenants = await listTenants();

  return (
    <AdminShell>
      <div className="container">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
          <div>
            <h1>Tenants</h1>
            <p className="text-muted" style={{ marginTop: "var(--space-1)" }}>
              Kunden-Workspaces auf dieser Plattform.
            </p>
          </div>
          <Link href="/tenants/new" className="btn btn-primary">
            Neuer Tenant
          </Link>
        </div>

        {tenants.length === 0 ? (
          <div className="empty-state">
            <h3>Noch keine Tenants angelegt</h3>
            <p>Lege den ersten Kunden-Workspace an, um loszulegen.</p>
            <Link href="/tenants/new" className="btn btn-primary">
              Neuer Tenant
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subdomain</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Infrastruktur</th>
                  <th>Erstellt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>{tenant.name}</td>
                    <td className="coord">{tenant.subdomain}</td>
                    <td>
                      <LegendKey
                        label={tenant.status}
                        variant={tenant.status === "active" ? "done" : "warning"}
                      />
                    </td>
                    <td>
                      <LegendKey label={PLAN_LABELS[tenant.plan] ?? tenant.plan} variant="default" />
                    </td>
                    <td>
                      <LegendKey
                        label={tenant.tier === "dedicated" ? "Dediziert" : "Geteilt"}
                        variant={tenant.tier === "dedicated" ? "warning" : "default"}
                      />
                    </td>
                    <td className="text-muted">{tenant.createdAt.toLocaleString("de-DE")}</td>
                    <td>
                      <div className="row" style={{ gap: "var(--space-2)" }}>
                        {(tenant.status === "active" || tenant.status === "disabled") && (
                          <ToggleTenantStatusButton
                            tenantId={tenant.id}
                            tenantName={tenant.name}
                            status={tenant.status}
                          />
                        )}
                        <DeleteTenantButton tenantId={tenant.id} tenantName={tenant.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
