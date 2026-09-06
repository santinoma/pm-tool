import { notFound, redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { computePortfolioProgress } from "@/tenant/portfolios/portfolioProgress";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { PortfolioDetailClient } from "./PortfolioDetailClient";

export const dynamic = "force-dynamic";

export default async function PortfolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [portfolio, allProjects] = await Promise.all([
    context.tenantDb.portfolio.findUnique({
      where: { id },
      include: { projects: true, goals: { orderBy: { createdAt: "desc" } } },
    }),
    context.tenantDb.project.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!portfolio) {
    notFound();
  }

  const projectIds = portfolio.projects.map((project) => project.id);
  const tasks =
    projectIds.length > 0
      ? await context.tenantDb.task.findMany({
          where: { projects: { some: { projectId: { in: projectIds } } } },
          include: { status: true },
        })
      : [];
  const progress = computePortfolioProgress(tasks.map((task) => ({ statusCategory: task.status.category })));

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle={portfolio.name}
    >
      <PortfolioDetailClient
        portfolio={{
          id: portfolio.id,
          name: portfolio.name,
          description: portfolio.description,
          projectIds: portfolio.projects.map((project) => project.id),
          goals: portfolio.goals.map((goal) => ({
            id: goal.id,
            name: goal.name,
            status: goal.status,
            dueDate: goal.dueDate ? goal.dueDate.toISOString().slice(0, 10) : null,
          })),
        }}
        progress={progress}
        allProjects={allProjects.map((project) => ({ id: project.id, name: project.name }))}
        canManage={canManageMembers(context.currentUser.role)}
      />
    </AppShellNextElite>
  );
}
