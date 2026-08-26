import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShell } from "@/ui/shell/AppShell";
import { WebhooksClient } from "./WebhooksClient";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    redirect("/login");
  }

  const endpoints = await context.tenantDb.webhookEndpoint.findMany({
    orderBy: { createdAt: "desc" },
    include: { deliveries: { orderBy: { createdAt: "desc" }, take: 5 } },
  });

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <WebhooksClient
        endpoints={endpoints.map((endpoint) => ({
          id: endpoint.id,
          url: endpoint.url,
          eventTypes: endpoint.eventTypes,
          enabled: endpoint.enabled,
          recentDeliveries: endpoint.deliveries.map((d) => ({
            id: d.id,
            attempt: d.attempt,
            success: d.success,
            statusCode: d.statusCode,
            errorMessage: d.errorMessage,
            createdAt: d.createdAt.toISOString(),
          })),
        }))}
      />
    </AppShell>
  );
}
