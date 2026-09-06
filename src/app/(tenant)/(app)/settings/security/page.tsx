import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { SESSION_COOKIE_NAME } from "@/tenant/auth/session";
import { TwoFactorSettingsClient } from "./TwoFactorSettingsClient";
import { ApiKeysClient } from "./ApiKeysClient";
import { SessionsClient } from "./SessionsClient";

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

  const cookieStore = await cookies();
  const currentSessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessions = await context.tenantDb.session.findMany({
    where: { userId: context.currentUser.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Security"
    >
      <div className="mx-auto flex max-w-xl flex-col gap-10 pb-10">
        <h1 className="text-2xl font-bold tracking-tight">Security</h1>
        <TwoFactorSettingsClient totpEnabled={context.currentUser.totpEnabled} />
        <ApiKeysClient
          keys={keys.map((key) => ({
            id: key.id,
            name: key.name,
            tokenPrefix: key.tokenPrefix,
            scope: key.scope,
            revokedAt: key.revokedAt ? key.revokedAt.toISOString() : null,
            lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
          }))}
        />
        <SessionsClient
          sessions={sessions.map((session) => ({
            id: session.id,
            userAgent: session.userAgent,
            createdAt: session.createdAt.toISOString(),
            lastSeenAt: session.lastSeenAt ? session.lastSeenAt.toISOString() : null,
            isCurrent: session.id === currentSessionId,
          }))}
        />
      </div>
    </AppShellNextElite>
  );
}
