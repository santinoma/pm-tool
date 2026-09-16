import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { RateCardsClient } from "./RateCardsClient";

export const dynamic = "force-dynamic";

// Reference "Setting up Rate Cards": named Rate Card containers, optionally
// assigned to a Company, are managed centrally here — mirrors Settings >
// Organization > Pipelines for deal stages.
export default async function RateCardsSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [rateCards, serviceTypes, clients] = await Promise.all([
    context.tenantDb.rateCard.findMany({
      include: { client: { select: { name: true } }, items: { include: { serviceType: true }, orderBy: { name: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    context.tenantDb.serviceType.findMany({ orderBy: { name: "asc" } }),
    context.tenantDb.client.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

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
      pageTitle="Rate cards"
    >
      <RateCardsClient
        canManage={canManageMembers(context.currentUser.role)}
        rateCards={rateCards.map((rateCard) => ({
          id: rateCard.id,
          name: rateCard.name,
          archived: rateCard.archived,
          clientId: rateCard.clientId,
          clientName: rateCard.client?.name ?? null,
          items: rateCard.items.map((item) => ({
            id: item.id,
            name: item.name,
            serviceTypeId: item.serviceTypeId,
            serviceTypeName: item.serviceType?.name ?? null,
            billingType: item.billingType,
            trackingUnit: item.trackingUnit,
            defaultPrice: item.defaultPrice,
          })),
        }))}
        serviceTypes={serviceTypes.map((type) => ({ id: type.id, name: type.name }))}
        clients={clients}
      />
    </AppShellNextElite>
  );
}
