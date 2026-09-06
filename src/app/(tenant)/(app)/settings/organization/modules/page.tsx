import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { ModulesSettingsClient } from "./ModulesSettingsClient";

export const dynamic = "force-dynamic";

export default async function ModulesSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  if (!canManageMembers(context.currentUser.role)) {
    redirect("/settings");
  }

  const settings = await getOrCreateTenantSettings(context.tenantDb);

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Module"
    >
      <div className="mx-auto max-w-xl pb-10">
        <ModulesSettingsClient
          crmEnabled={settings.crmEnabled}
          reportsEnabled={settings.reportsEnabled}
          resourcingEnabled={settings.resourcingEnabled}
        />
      </div>
    </AppShellNextElite>
  );
}
