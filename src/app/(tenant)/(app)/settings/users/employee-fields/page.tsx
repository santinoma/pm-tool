import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { EmployeeFieldsSettingsClient } from "./EmployeeFieldsSettingsClient";

export const dynamic = "force-dynamic";

export default async function EmployeeFieldsSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const fields = await context.tenantDb.customFieldDef.findMany({
    where: { entityType: "user" },
    orderBy: { label: "asc" },
  });

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Employee fields"
    >
      <EmployeeFieldsSettingsClient
        canManage={canManageMembers(context.currentUser.role)}
        fields={fields.map((field) => ({
          id: field.id,
          key: field.key,
          label: field.label,
          type: field.type,
          options: field.options,
          required: field.required,
          sensitive: field.sensitive,
        }))}
      />
    </AppShellNextElite>
  );
}
