import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShell } from "@/ui/shell/AppShell";
import { TwoFactorSettingsClient } from "./TwoFactorSettingsClient";
import { ApiKeysClient } from "./ApiKeysClient";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const keys = await context.tenantDb.apiKey.findMany({
    where: { userId: context.currentUser.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <TwoFactorSettingsClient totpEnabled={context.currentUser.totpEnabled} />
      <ApiKeysClient
        keys={keys.map((key) => ({
          id: key.id,
          name: key.name,
          tokenPrefix: key.tokenPrefix,
          revokedAt: key.revokedAt ? key.revokedAt.toISOString() : null,
          lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
        }))}
      />
    </AppShell>
  );
}
