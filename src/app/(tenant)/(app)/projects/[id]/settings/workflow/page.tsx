import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { WorkflowEditorClient } from "./WorkflowEditorClient";
import { ProjectTeamPanel } from "./ProjectTeamPanel";

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

  const [statuses, customFields, transitionRules, project, members, allUsers] = await Promise.all([
    context.tenantDb.workflowStatus.findMany({
      where: { workflow: { projects: { some: { id } } } },
      orderBy: { position: "asc" },
    }),
    context.tenantDb.customFieldDef.findMany({ where: { projectId: id } }),
    context.tenantDb.transitionRule.findMany({
      where: { projectId: id },
      include: { fromStatus: true, toStatus: true },
      orderBy: { createdAt: "desc" },
    }),
    context.tenantDb.project.findUnique({
      where: { id },
      select: { isTemplate: true, workflow: { select: { id: true, name: true, _count: { select: { projects: true } } } } },
    }),
    context.tenantDb.projectMember.findMany({ where: { projectId: id }, include: { user: true } }),
    context.tenantDb.user.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <>
    <ProjectTeamPanel
      projectId={id}
      canManage={canManageMembers(context.currentUser.role)}
      isTemplate={project?.isTemplate ?? false}
      members={members.map((member) => ({
        id: member.id,
        userId: member.userId,
        label: member.user.name ?? member.user.email,
      }))}
      allUsers={allUsers.map((user) => ({ id: user.id, label: user.name ?? user.email }))}
    />
    <WorkflowEditorClient
      projectId={id}
      canManage={canManageMembers(context.currentUser.role)}
      workflowName={project?.workflow.name ?? ""}
      sharedProjectCount={project?.workflow._count.projects ?? 1}
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
    </>
  );
}
