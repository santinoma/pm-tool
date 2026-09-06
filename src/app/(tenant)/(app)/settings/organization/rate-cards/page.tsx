import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { RateCardsClient } from "./RateCardsClient";

export const dynamic = "force-dynamic";

export default async function RateCardsSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [rateCardItems, serviceTypes] = await Promise.all([
    context.tenantDb.rateCardItem.findMany({ include: { serviceType: true }, orderBy: { name: "asc" } }),
    context.tenantDb.serviceType.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Rate cards"
    >
      <RateCardsClient
        canManage={canManageMembers(context.currentUser.role)}
        rateCardItems={rateCardItems.map((item) => ({
          id: item.id,
          name: item.name,
          serviceTypeId: item.serviceTypeId,
          serviceTypeName: item.serviceType?.name ?? null,
          billingType: item.billingType,
          trackingUnit: item.trackingUnit,
          defaultPrice: item.defaultPrice,
        }))}
        serviceTypes={serviceTypes.map((type) => ({ id: type.id, name: type.name }))}
      />
    </AppShellNextElite>
  );
}
