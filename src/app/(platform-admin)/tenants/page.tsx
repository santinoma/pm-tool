import Link from "next/link";
import { listTenants } from "@/platform/tenantRegistry";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const tenants = await listTenants();

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Tenants</h1>
        <Link href="/tenants/new">Neuer Tenant</Link>
      </div>

      {tenants.length === 0 ? (
        <p>Noch keine Tenants angelegt.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
              <th style={{ padding: "0.5rem" }}>Name</th>
              <th style={{ padding: "0.5rem" }}>Subdomain</th>
              <th style={{ padding: "0.5rem" }}>Status</th>
              <th style={{ padding: "0.5rem" }}>Erstellt</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.5rem" }}>{tenant.name}</td>
                <td style={{ padding: "0.5rem" }}>{tenant.subdomain}</td>
                <td style={{ padding: "0.5rem" }}>{tenant.status}</td>
                <td style={{ padding: "0.5rem" }}>
                  {tenant.createdAt.toLocaleString("de-DE")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
