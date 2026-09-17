import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { getOrCreateSystemPermissionSets } from "@/tenant/permissions/systemPermissionSets";
import { RolesClient } from "./RolesClient";

export const dynamic = "force-dynamic";

export default async function RolesSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  // T402: die acht Productive-Standard-Permission-Sets sind IMMER verfügbar
  // (nicht ans `custom_roles`-Feature/Ultimate-Plan gebunden) — nur das
  // Anlegen/Bearbeiten eigener, zusätzlicher Sets bleibt Ultimate-gated.
  await getOrCreateSystemPermissionSets(context.tenantDb);
  const roles = await context.tenantDb.customRole.findMany({ orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }] });

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Rollen & Rechte"
    >
      <RolesClient
        canManage={canManageMembers(context.currentUser.role)}
        hasCustomRolesFeature={context.entitledFeatures.has("custom_roles")}
        roles={roles.map((role) => ({ id: role.id, name: role.name, permissions: role.permissions, isSystem: role.isSystem }))}
      />
    </AppShellNextElite>
  );
}
