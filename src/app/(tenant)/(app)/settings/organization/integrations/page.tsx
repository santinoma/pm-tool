import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { INTEGRATION_TEMPLATES } from "@/tenant/integrations/templates";
import { IntegrationsMarketplaceClient } from "./IntegrationsMarketplaceClient";

export const dynamic = "force-dynamic";

export default async function IntegrationsMarketplacePage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const installed = await context.tenantDb.webhookEndpoint.findMany({
    where: { integrationTemplateKey: { not: null } },
  });
  const installedKeys = new Set(installed.map((endpoint) => endpoint.integrationTemplateKey));

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Integrations"
    >
      <IntegrationsMarketplaceClient
        canManage={canManageMembers(context.currentUser.role)}
        templates={INTEGRATION_TEMPLATES.map((template) => ({
          ...template,
          installed: installedKeys.has(template.key),
        }))}
      />
    </AppShellNextElite>
  );
}
