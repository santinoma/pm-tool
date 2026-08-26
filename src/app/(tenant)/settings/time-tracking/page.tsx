import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { AppShell } from "@/ui/shell/AppShell";
import { TimeTrackingSettingsClient } from "./TimeTrackingSettingsClient";

export const dynamic = "force-dynamic";

export default async function TimeTrackingSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const settings = await getOrCreateTenantSettings(context.tenantDb);

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <TimeTrackingSettingsClient
        allowProjectLevelTimeEntries={settings.allowProjectLevelTimeEntries}
        timeTrackingMode={settings.timeTrackingMode}
      />
    </AppShell>
  );
}
