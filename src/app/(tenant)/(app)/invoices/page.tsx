import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { InvoicesClient } from "./InvoicesClient";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const invoices = await context.tenantDb.invoice.findMany({
    where: isPrivileged
      ? undefined
      : { budget: { project: { members: { some: { userId: context.currentUser.id } } } } },
    orderBy: { createdAt: "desc" },
    include: { budget: { include: { project: { select: { id: true, name: true } } } } },
  });

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Rechnungen"
    >
      <InvoicesClient
        invoices={invoices.map((invoice) => ({
          id: invoice.id,
          projectId: invoice.budget.projectId,
          projectName: invoice.budget.project.name,
          budgetId: invoice.budgetId,
          budgetTitle: invoice.budget.title,
          status: invoice.status,
          totalAmount: invoice.totalAmount,
          createdAt: invoice.createdAt.toISOString(),
        }))}
      />
    </AppShellNextElite>
  );
}
