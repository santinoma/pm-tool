import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { ApprovalsClient } from "./ApprovalsClient";

export const dynamic = "force-dynamic";

// Reference "Approving Time/Expense/Absence: Overview" — a single Approval Inbox
// aggregating all three pending-approval sources for managers, rather than the
// scattered per-module approval columns this app had before.
export default async function ApprovalsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  if (!canManageMembers(context.currentUser.role)) {
    redirect("/dashboard");
  }

  const [timeEntries, expenses, absenceRequests] = await Promise.all([
    context.tenantDb.timeEntry.findMany({
      where: { approvalStatus: "pending", submittedAt: { not: null } },
      include: { user: true, task: { select: { title: true } }, project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    context.tenantDb.expense.findMany({
      where: { approvalStatus: "pending" },
      include: {
        createdBy: { select: { name: true, email: true } },
        project: { select: { name: true } },
        budget: { select: { title: true } },
      },
      orderBy: { incurredAt: "desc" },
    }),
    context.tenantDb.absenceRequest.findMany({
      where: { status: "pending" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
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
      pageTitle="Approvals"
    >
      <ApprovalsClient
        timeEntries={timeEntries.map((entry) => ({
          id: entry.id,
          userLabel: entry.user.name ?? entry.user.email,
          taskTitle: entry.task?.title ?? null,
          projectName: entry.project?.name ?? null,
          description: entry.description,
          durationMinutes: entry.durationMinutes ?? 0,
          startedAt: entry.startedAt?.toISOString() ?? null,
          createdAt: entry.createdAt.toISOString(),
        }))}
        expenses={expenses.map((expense) => ({
          id: expense.id,
          userLabel: expense.createdBy?.name ?? expense.createdBy?.email ?? "—",
          projectName: expense.project?.name ?? null,
          budgetTitle: expense.budget?.title ?? null,
          description: expense.description,
          amount: expense.amount,
          incurredAt: expense.incurredAt.toISOString(),
        }))}
        absenceRequests={absenceRequests.map((request) => ({
          id: request.id,
          userLabel: request.user.name ?? request.user.email,
          type: request.type,
          startDate: request.startDate.toISOString(),
          endDate: request.endDate.toISOString(),
          note: request.note,
        }))}
      />
    </AppShellNextElite>
  );
}
