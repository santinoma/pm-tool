import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { ServiceTypesClient } from "./ServiceTypesClient";

export const dynamic = "force-dynamic";

export default async function ServiceTypesSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const serviceTypes = await context.tenantDb.serviceType.findMany({ orderBy: { name: "asc" } });

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Service types"
    >
      <ServiceTypesClient
        canManage={canManageMembers(context.currentUser.role)}
        serviceTypes={serviceTypes.map((type) => ({ id: type.id, name: type.name }))}
      />
    </AppShellNextElite>
  );
}
