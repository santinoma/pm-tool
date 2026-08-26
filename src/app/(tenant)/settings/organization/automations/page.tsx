import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShell } from "@/ui/shell/AppShell";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AutomationsClient } from "./AutomationsClient";

export const dynamic = "force-dynamic";

export default async function AutomationsSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [rules, users] = await Promise.all([
    context.tenantDb.automationRule.findMany({
      include: { actions: { include: { targetUser: true }, orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    context.tenantDb.user.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <AutomationsClient
        canManage={canManageMembers(context.currentUser.role)}
        users={users.map((user) => ({ id: user.id, label: user.name ?? user.email }))}
        rules={rules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          trigger: rule.trigger,
          conditionStatusCategory: rule.conditionStatusCategory,
          isEnabled: rule.isEnabled,
          actions: rule.actions.map((action) => ({
            type: action.type,
            targetUserLabel: action.targetUser.name ?? action.targetUser.email,
          })),
        }))}
      />
    </AppShell>
  );
}
