import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { ExpensesClient } from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const [expenses, projects, serviceTypes] = await Promise.all([
    context.tenantDb.expense.findMany({
      where: isPrivileged ? undefined : { project: { members: { some: { userId: context.currentUser.id } } } },
      orderBy: { incurredAt: "desc" },
      include: {
        project: { select: { id: true, name: true, client: { select: { name: true } } } },
        budget: { select: { id: true, title: true } },
        serviceType: { select: { id: true, name: true } },
        createdBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
      },
    }),
    context.tenantDb.project.findMany({
      where: isPrivileged ? undefined : { members: { some: { userId: context.currentUser.id } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    context.tenantDb.serviceType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Ausgaben"
    >
      <ExpensesClient
        projects={projects}
        serviceTypes={serviceTypes}
        canApprove={isPrivileged}
        expenses={expenses.map((expense) => ({
          id: expense.id,
          number: expense.number,
          description: expense.description,
          amount: expense.amount,
          billable: expense.billable,
          incurredAt: expense.incurredAt.toISOString(),
          projectId: expense.projectId,
          projectName: expense.project.name,
          clientName: expense.project.client?.name ?? null,
          budgetLabel: expense.budget?.title ?? null,
          serviceTypeName: expense.serviceType?.name ?? null,
          personName: expense.createdBy.name ?? expense.createdBy.email,
          approvalStatus: expense.approvalStatus,
          approvedByName: expense.approvedBy?.name ?? expense.approvedBy?.email ?? null,
        }))}
      />
    </AppShellNextElite>
  );
}
