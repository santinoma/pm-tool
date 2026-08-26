import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { AppShell } from "@/ui/shell/AppShell";
import { OrganizationSettingsClient } from "./OrganizationSettingsClient";
import { SlackCaptureClient } from "./SlackCaptureClient";

export const dynamic = "force-dynamic";

export default async function OrganizationSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [settings, slackConfig, projects] = await Promise.all([
    getOrCreateTenantSettings(context.tenantDb),
    context.tenantDb.slackCaptureConfig.findFirst(),
    context.tenantDb.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <OrganizationSettingsClient
        currency={settings.currency}
        triageEnabled={settings.triageEnabled}
        require2fa={settings.require2fa}
        scimBearerToken={settings.scimBearerToken}
      />
      <SlackCaptureClient
        config={
          slackConfig
            ? {
                signingSecret: slackConfig.signingSecret,
                defaultProjectId: slackConfig.defaultProjectId,
                enabled: slackConfig.enabled,
              }
            : null
        }
        projects={projects.map((project) => ({ id: project.id, name: project.name }))}
      />
    </AppShell>
  );
}
