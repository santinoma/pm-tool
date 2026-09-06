import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { buildAcsUrl, buildSpEntityId, resolveBaseDomain } from "@/tenant/sso/samlServiceProvider";
import { SsoSettingsClient } from "./SsoSettingsClient";

export const dynamic = "force-dynamic";

export default async function SsoSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  if (!canManageMembers(context.currentUser.role)) {
    redirect("/settings");
  }

  const config = await context.tenantDb.ssoConfig.findFirst();
  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain") ?? "";
  const baseDomain = resolveBaseDomain();

  return (
    <AppShellNextElite
      currentUser={{
        name: context.currentUser.name,
        email: context.currentUser.email,
        avatarUrl: context.currentUser.avatarUrl,
        role: context.currentUser.role,
        locale: context.currentUser.locale,
      }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Single Sign-On"
    >
      <SsoSettingsClient
        config={
          config
            ? {
                provider: config.provider,
                entryPoint: config.entryPoint,
                issuer: config.issuer,
                cert: config.cert,
                enabled: config.enabled,
                enforceSso: config.enforceSso,
              }
            : null
        }
        metadataUrl={buildSpEntityId(subdomain, baseDomain)}
        acsUrl={buildAcsUrl(subdomain, baseDomain)}
      />
    </AppShellNextElite>
  );
}
