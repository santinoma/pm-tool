import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { WorkflowEditorClient } from "./WorkflowEditorClient";

export const dynamic = "force-dynamic";

export default async function WorkflowSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [statuses, customFields, transitionRules] = await Promise.all([
    context.tenantDb.workflowStatus.findMany({
      where: { projectId: id },
      orderBy: { position: "asc" },
    }),
    context.tenantDb.customFieldDef.findMany({ where: { projectId: id } }),
    context.tenantDb.transitionRule.findMany({
      where: { projectId: id },
      include: { fromStatus: true, toStatus: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <WorkflowEditorClient
      projectId={id}
      canManage={canManageMembers(context.currentUser.role)}
      statuses={statuses.map((status) => ({
        id: status.id,
        name: status.name,
        category: status.category,
        position: status.position,
        isDefault: status.isDefault,
      }))}
      customFields={customFields.map((field) => ({ id: field.id, label: field.label }))}
      transitionRules={transitionRules.map((rule) => ({
        id: rule.id,
        fromStatusName: rule.fromStatus?.name ?? null,
        toStatusName: rule.toStatus.name,
        requiredFieldKeys: rule.requiredFieldKeys,
      }))}
    />
  );
}
