import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { ClientsClient } from "./ClientsClient";

export const dynamic = "force-dynamic";

export default async function ClientsSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const clients = await context.tenantDb.client.findMany({ orderBy: { name: "asc" } });

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Clients"
    >
      <ClientsClient
        canManage={canManageMembers(context.currentUser.role)}
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          note: client.note,
          taxId: client.taxId,
          website: client.website,
          billingAddress: client.billingAddress,
          archivedAt: client.archivedAt ? client.archivedAt.toISOString() : null,
          parentId: client.parentId,
        }))}
      />
    </AppShellNextElite>
  );
}
