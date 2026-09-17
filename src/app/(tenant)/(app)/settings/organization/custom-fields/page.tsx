import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { CustomFieldsSettingsClient } from "./CustomFieldsSettingsClient";

export const dynamic = "force-dynamic";

// Reference "Task Custom Fields Library" / "Docs Custom Fields": library
// fields are defined once and attached to many projects at once, edited
// once with the change propagating everywhere — mirrors Settings >
// Organization > Workflows/Pipelines for their respective catalogs.
export default async function CustomFieldsSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [fields, projects] = await Promise.all([
    context.tenantDb.customFieldDef.findMany({
      where: { library: true },
      include: { projectAttachments: { include: { project: { select: { id: true, name: true } } } } },
      orderBy: { label: "asc" },
    }),
    context.tenantDb.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
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
      pageTitle="Custom fields"
    >
      <CustomFieldsSettingsClient
        canManage={canManageMembers(context.currentUser.role)}
        fields={fields.map((field) => ({
          id: field.id,
          key: field.key,
          label: field.label,
          type: field.type,
          entityType: field.entityType,
          options: field.options,
          required: field.required,
          sensitive: field.sensitive,
          autoAttach: field.autoAttach,
          attachedProjects: field.projectAttachments.map((attachment) => ({ id: attachment.project.id, name: attachment.project.name })),
        }))}
        projects={projects}
      />
    </AppShellNextElite>
  );
}
