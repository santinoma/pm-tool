import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { DealsClient } from "./DealsClient";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [deals, companies, users] = await Promise.all([
    context.tenantDb.deal.findMany({
      orderBy: { createdAt: "desc" },
      include: { company: { select: { id: true, name: true } }, owner: { select: { name: true, email: true } } },
    }),
    context.tenantDb.client.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    context.tenantDb.user.findMany({ select: { id: true, name: true, email: true } }),
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
        deals={deals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          stage: deal.stage,
          companyId: deal.companyId,
          companyName: deal.company.name,
          ownerLabel: deal.owner.name ?? deal.owner.email,
          estimatedValue: deal.estimatedValue,
          probability: deal.probability,
          lostReason: deal.lostReason,
        }))}
      />
    </AppShellNextElite>
  );
}
