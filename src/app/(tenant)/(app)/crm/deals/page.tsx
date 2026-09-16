import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { getOrCreateDefaultPipeline, ensureDefaultLostReasons } from "@/tenant/deals/pipeline";
import { DealsClient } from "./DealsClient";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  await getOrCreateDefaultPipeline(context.tenantDb);
  const lostReasons = await ensureDefaultLostReasons(context.tenantDb);

  const [deals, companies, users, statuses] = await Promise.all([
    context.tenantDb.deal.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { name: true, email: true } },
        status: true,
        lostReason: true,
      },
    }),
    context.tenantDb.client.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    context.tenantDb.user.findMany({ select: { id: true, name: true, email: true } }),
    context.tenantDb.dealStatus.findMany({
      where: { pipeline: { archived: false } },
      orderBy: { position: "asc" },
    }),
  ]);

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Deals"
    >
      <DealsClient
        companies={companies}
        users={users.map((u) => ({ id: u.id, label: u.name ?? u.email }))}
        statuses={statuses.map((status) => ({
          id: status.id,
          name: status.name,
          category: status.category,
          position: status.position,
        }))}
        lostReasons={lostReasons.filter((reason) => !reason.archived).map((reason) => ({ id: reason.id, label: reason.label }))}
        deals={deals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          statusId: deal.statusId,
          statusName: deal.status.name,
          statusCategory: deal.status.category,
          companyId: deal.companyId,
          companyName: deal.company.name,
          ownerLabel: deal.owner.name ?? deal.owner.email,
          estimatedValue: deal.estimatedValue,
          probability: deal.probability,
          lostReasonId: deal.lostReasonId,
          lostReasonLabel: deal.lostReason?.label ?? null,
          lostReasonNote: deal.lostReasonNote,
        }))}
      />
    </AppShellNextElite>
  );
}
