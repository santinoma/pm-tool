import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { BudgetTemplatesClient } from "./BudgetTemplatesClient";

export const dynamic = "force-dynamic";

// Reference "Budget Templates": Productive's Template Center is an org-wide
// catalog (Customize > Template Center) — templates are reusable across ANY
// project, not scoped to the project they were created in (T311; previously
// only reachable per-project via the "create from template" dropdown, and
// only usable within that same project).
export default async function BudgetTemplatesPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [templates, projects, users] = await Promise.all([
    context.tenantDb.budget.findMany({
      where: { isTemplate: true },
      include: { project: { select: { id: true, name: true } }, owner: true, sections: true },
      orderBy: { title: "asc" },
    }),
    context.tenantDb.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    context.tenantDb.user.findMany({ orderBy: { email: "asc" }, select: { id: true, name: true, email: true } }),
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
      pageTitle="Budget Templates"
    >
      <BudgetTemplatesClient
        canManage={canManageMembers(context.currentUser.role)}
        templates={templates.map((template) => ({
          id: template.id,
          title: template.title,
          color: template.color,
          projectId: template.projectId,
          projectName: template.project.name,
          ownerLabel: template.owner.name ?? template.owner.email,
          sectionCount: template.sections.length,
        }))}
        projects={projects}
        users={users.map((user) => ({ id: user.id, label: user.name ?? user.email }))}
      />
    </AppShellNextElite>
  );
}
