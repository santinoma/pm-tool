import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShell } from "@/ui/shell/AppShell";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { RolesClient } from "./RolesClient";

export const dynamic = "force-dynamic";

export default async function RolesSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const roles = await context.tenantDb.customRole.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <AppShell
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }}
      entitledFeatures={Array.from(context.entitledFeatures)}
    >
      <RolesClient
        canManage={canManageMembers(context.currentUser.role)}
        roles={roles.map((role) => ({ id: role.id, name: role.name, permissions: role.permissions }))}
      />
    </AppShell>
  );
}
