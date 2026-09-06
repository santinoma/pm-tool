import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AuditLogClient } from "./AuditLogClient";

export const dynamic = "force-dynamic";

const AUDIT_LOG_ENTITY_TYPES = ["User", "ApiKey", "SsoConfig", "CustomRole"];

export default async function AuditLogSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  if (!canManageMembers(context.currentUser.role)) {
    redirect("/settings/organization");
  }

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Audit-Log"
    >
      <AuditLogClient entityTypes={AUDIT_LOG_ENTITY_TYPES} />
    </AppShellNextElite>
  );
}
