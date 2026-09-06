import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { computeEffectiveModules } from "@/tenant/projects/moduleCatalog";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { ProjectSubnav } from "@/ui/nextelite/ProjectSubnav";

export default async function ProjectLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [project, settings, wikiCount, budgetCount, cycleCount, baselineCount, checkInCount, calendarTaskCount, ganttTaskCount, hillChartTaskCount] = await Promise.all([
    context.tenantDb.project.findUnique({ where: { id } }),
    getOrCreateTenantSettings(context.tenantDb),
    context.tenantDb.wikiPage.count({ where: { projectId: id } }),
    context.tenantDb.budget.count({ where: { projectId: id } }),
    context.tenantDb.cycle.count({ where: { projectId: id } }),
    context.tenantDb.baseline.count({ where: { projectId: id } }),
    context.tenantDb.checkInSchedule.count({ where: { projectId: id } }),
    context.tenantDb.task.count({ where: { projects: { some: { projectId: id } }, dueDate: { not: null } } }),
    context.tenantDb.task.count({ where: { projects: { some: { projectId: id } }, startDate: { not: null } } }),
    context.tenantDb.task.count({ where: { projects: { some: { projectId: id } }, hillPosition: { not: null } } }),
  ]);
  if (!project) {
    redirect("/projects");
  }

  const effectiveModules = Array.from(
    computeEffectiveModules(project.enabledModules, {
      hasWiki: wikiCount > 0,
      hasBudgets: budgetCount > 0,
      hasCycles: cycleCount > 0,
      hasBaselines: baselineCount > 0,
      hasCheckIns: checkInCount > 0,
      hasCalendarSchedule: calendarTaskCount > 0,
      hasGanttSchedule: ganttTaskCount > 0,
      hasHillChartPosition: hillChartTaskCount > 0,
    }),
  );

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle={project.name}
    >
      <div className="-mx-4 md:-mx-6">
        <div className="px-4 pb-4 md:px-6">
          <div className="text-xs font-medium text-muted-foreground">Projekt</div>
          <h2 className="mt-1 text-xl font-bold tracking-tight">{project.name}</h2>
        </div>
        <ProjectSubnav
          projectId={id}
          showTriage={settings.triageEnabled}
          entitledFeatures={Array.from(context.entitledFeatures)}
          enabledModules={effectiveModules}
        />
      </div>
      <div className="pt-6">{children}</div>
      {modal}
    </AppShellNextElite>
  );
}
