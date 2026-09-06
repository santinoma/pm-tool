import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { computePortfolioProgress } from "@/tenant/portfolios/portfolioProgress";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { PortfoliosListClient } from "./PortfoliosListClient";

export const dynamic = "force-dynamic";

export default async function PortfoliosPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [portfolios, allProjects] = await Promise.all([
    context.tenantDb.portfolio.findMany({
      orderBy: { createdAt: "desc" },
      include: { projects: true, goals: true },
    }),
    context.tenantDb.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows = await Promise.all(
    portfolios.map(async (portfolio) => {
      const projectIds = portfolio.projects.map((project) => project.id);
      const tasks =
        projectIds.length > 0
          ? await context.tenantDb.task.findMany({
              where: { projects: { some: { projectId: { in: projectIds } } } },
              include: { status: true },
            })
          : [];
      const progress = computePortfolioProgress(tasks.map((task) => ({ statusCategory: task.status.category })));
      return {
        id: portfolio.id,
        name: portfolio.name,
        projectCount: portfolio.projects.length,
        goalCount: portfolio.goals.length,
        progress,
      };
    }),
  );

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Portfolios"
    >
      <PortfoliosListClient
        portfolios={rows}
        canManage={canManageMembers(context.currentUser.role)}
        allProjects={allProjects.map((project) => ({ id: project.id, name: project.name }))}
      />
    </AppShellNextElite>
  );
}
