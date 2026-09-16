import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { PipelinesSettingsClient } from "./PipelinesSettingsClient";

export const dynamic = "force-dynamic";

// Reference "Setting up Your Sales Pipelines" / "General Sales Settings": Pipelines
// and Lost Reasons are managed centrally here — mirrors Settings > Organization >
// Workflows for tasks.
export default async function PipelinesSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [pipelines, lostReasons] = await Promise.all([
    context.tenantDb.pipeline.findMany({
      include: { statuses: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    context.tenantDb.lostReason.findMany({ orderBy: { label: "asc" } }),
  ]);

  const dealCountsByStatus = await context.tenantDb.deal.groupBy({ by: ["statusId"], _count: { statusId: true } });
  const dealCountByStatusId = new Map(dealCountsByStatus.map((row) => [row.statusId, row._count.statusId]));

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
      pageTitle="Pipelines"
    >
      <PipelinesSettingsClient
        canManage={canManageMembers(context.currentUser.role)}
        pipelines={pipelines.map((pipeline) => ({
          id: pipeline.id,
          name: pipeline.name,
          archived: pipeline.archived,
          statuses: pipeline.statuses.map((status) => ({
            id: status.id,
            name: status.name,
            category: status.category,
            position: status.position,
            defaultProbability: status.defaultProbability,
            trackTime: status.trackTime,
            trackExpenses: status.trackExpenses,
            createBookings: status.createBookings,
            dealCount: dealCountByStatusId.get(status.id) ?? 0,
          })),
        }))}
        lostReasons={lostReasons.map((reason) => ({ id: reason.id, label: reason.label, archived: reason.archived }))}
      />
    </AppShellNextElite>
  );
}
