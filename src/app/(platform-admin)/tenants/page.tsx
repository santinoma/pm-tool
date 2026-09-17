import Link from "next/link";
import { Plus } from "lucide-react";
import { listTenants } from "@/platform/tenantRegistry";
import { AdminShellNextElite } from "@/ui/nextelite/AdminShellNextElite";
import { Button } from "@/ui/shadcn/components/button";
import { TenantsTable } from "./TenantsTable";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const tenants = await listTenants();

  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.status === "active").length,
    enterprise: tenants.filter((t) => t.plan === "enterprise").length,
    dedicated: tenants.filter((t) => t.tier === "dedicated").length,
  };

  const rows = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.subdomain,
    status: tenant.status,
    plan: tenant.plan,
    tier: tenant.tier,
    seatLimit: tenant.seatLimit,
    createdAtLabel: tenant.createdAt.toLocaleDateString("de-DE"),
  }));

  return (
    <AdminShellNextElite>
      <div className="flex flex-wrap items-end justify-between gap-5 py-6">
        <div>
          <div className="mb-1.5 text-xs font-semibold tracking-wide text-primary uppercase">Plattform</div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Kunden-Workspaces auf dieser Plattform verwalten.</p>
        </div>
        <Button asChild>
          <Link href="/tenants/new">
            <Plus className="size-4" />
            Neuer Tenant
          </Link>
        </Button>
      </div>

      <TenantsTable tenants={rows} stats={stats} />
    </AdminShellNextElite>
  );
}
