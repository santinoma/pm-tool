import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { WorkflowsSettingsClient } from "./WorkflowsSettingsClient";

export const dynamic = "force-dynamic";

// Reference "Creating and Managing Workflows": Workflows are managed centrally here
// rather than per project — several projects can share one, and editing a Workflow's
// statuses (see the project-level Workflow tab, which now edits the same records)
// affects every project that uses it.
export default async function WorkflowsSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const workflows = await context.tenantDb.workflow.findMany({
    include: {
      statuses: { orderBy: { position: "asc" } },
      projects: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

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
      pageTitle="Workflows"
    >
      <WorkflowsSettingsClient
        canManage={canManageMembers(context.currentUser.role)}
        workflows={workflows.map((workflow) => ({
          id: workflow.id,
          name: workflow.name,
          archived: workflow.archived,
          statuses: workflow.statuses.map((status) => ({
            id: status.id,
            name: status.name,
            category: status.category,
            position: status.position,
            isDefault: status.isDefault,
          })),
          projects: workflow.projects.map((project) => ({ id: project.id, name: project.name })),
        }))}
      />
    </AppShellNextElite>
  );
}
