import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { getOrCreateTimeTrackingPolicy } from "@/tenant/timeTracking/policy";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { TimeTrackingSettingsClient } from "./TimeTrackingSettingsClient";

export const dynamic = "force-dynamic";

export default async function TimeTrackingSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const settings = await getOrCreateTenantSettings(context.tenantDb);
  const isPrivileged = canManageMembers(context.currentUser.role);
  const policy = isPrivileged ? await getOrCreateTimeTrackingPolicy(context.tenantDb) : null;

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Zeiterfassung – Einstellungen"
    >
      <TimeTrackingSettingsClient
        allowProjectLevelTimeEntries={settings.allowProjectLevelTimeEntries}
        timeTrackingMode={settings.timeTrackingMode}
        timeApprovalEnabled={settings.timeApprovalEnabled}
        isPrivileged={isPrivileged}
        policy={
          policy
            ? {
                maxDailyHours: policy.maxDailyHours,
                blockWeekends: policy.blockWeekends,
                blockOverlaps: policy.blockOverlaps,
              }
            : null
        }
      />
    </AppShellNextElite>
  );
}
