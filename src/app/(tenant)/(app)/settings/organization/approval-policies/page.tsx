import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { ApprovalPoliciesSettingsClient } from "./ApprovalPoliciesSettingsClient";

export const dynamic = "force-dynamic";

// Reference "Setting Up Time and Expenses Approval Policies for Budgets":
// a named, reusable approver configuration (who must approve, any/all/none)
// assignable to many budgets at once — mirrors Settings > Organization >
// Pipelines/Rate Cards/Custom Fields for their respective catalogs.
export default async function ApprovalPoliciesSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [policies, users] = await Promise.all([
    context.tenantDb.approvalPolicy.findMany({
      include: {
        approvers: { include: { specificUser: { select: { id: true, name: true, email: true } } } },
        _count: { select: { budgets: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    context.tenantDb.user.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true } }),
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
      pageTitle="Approval Policies"
    >
      <ApprovalPoliciesSettingsClient
        canManage={canManageMembers(context.currentUser.role)}
        policies={policies.map((policy) => ({
          id: policy.id,
          name: policy.name,
          description: policy.description,
          timeApprovalMode: policy.timeApprovalMode,
          expenseApprovalMode: policy.expenseApprovalMode,
          isDefault: policy.isDefault,
          archived: policy.archived,
          budgetCount: policy._count.budgets,
          approvers: policy.approvers.map((approver) => ({
            id: approver.id,
            kind: approver.kind,
            roleType: approver.roleType,
            specificUserLabel: approver.specificUser ? (approver.specificUser.name ?? approver.specificUser.email) : null,
          })),
        }))}
        users={users.map((user) => ({ id: user.id, label: user.name ?? user.email }))}
      />
    </AppShellNextElite>
  );
}
