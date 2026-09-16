import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
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
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Organisation"
    >
      <div className="mx-auto flex max-w-xl flex-col gap-10 pb-10">
        <OrganizationSettingsClient
          currency={settings.currency}
          triageEnabled={settings.triageEnabled}
          require2fa={settings.require2fa}
          scimBearerToken={settings.scimBearerToken}
          timeZone={settings.timeZone}
          timeFormat={settings.timeFormat}
          dateFormat={settings.dateFormat}
          numberFormat={settings.numberFormat}
          weekStartDay={settings.weekStartDay}
          workingDays={settings.workingDays}
          personDayHours={settings.personDayHours}
          fiscalYearEnabled={settings.fiscalYearEnabled}
          fiscalYearStartMonth={settings.fiscalYearStartMonth}
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
      </div>
    </AppShellNextElite>
  );
}
