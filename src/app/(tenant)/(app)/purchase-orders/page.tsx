import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { PurchaseOrdersClient } from "./PurchaseOrdersClient";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const [purchaseOrders, projects] = await Promise.all([
    context.tenantDb.purchaseOrder.findMany({
      where: isPrivileged ? undefined : { project: { members: { some: { userId: context.currentUser.id } } } },
      orderBy: { orderedAt: "desc" },
      include: { project: { select: { id: true, name: true } } },
    }),
    context.tenantDb.project.findMany({
      where: isPrivileged ? undefined : { members: { some: { userId: context.currentUser.id } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Bestellungen"
    >
      <PurchaseOrdersClient
        projects={projects}
        purchaseOrders={purchaseOrders.map((po) => ({
          id: po.id,
          vendorName: po.vendorName,
          amount: po.amount,
          status: po.status,
          sentStatus: po.sentStatus,
          paymentStatus: po.paymentStatus,
          orderedAt: po.orderedAt.toISOString(),
          projectId: po.projectId,
          projectName: po.project.name,
        }))}
      />
    </AppShellNextElite>
  );
}
