import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getTenantContext } from "@/tenant/context";
import { computeProgress } from "@/tenant/reporting/progress";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { FavoriteButton } from "@/ui/components/FavoriteButton";
import { Button } from "@/ui/shadcn/components/button";
import { Progress } from "@/ui/shadcn/components/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const projects = await context.tenantDb.project.findMany({
    where: isPrivileged ? undefined : { members: { some: { userId: context.currentUser.id } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { taskLinks: true } },
      taskLinks: { where: { isPrimary: true }, include: { task: { include: { status: true } } } },
    },
  });

  const rows = projects.map((project) => {
    const tasks = project.taskLinks
      .map((link) => link.task)
      .filter((task) => !task.inTriage)
      .map((task) => ({ statusCategory: task.status.category }));
    return { project, progress: computeProgress(tasks) };
  });

  const favoriteProjects = await context.tenantDb.favorite.findMany({
    where: { userId: context.currentUser.id, entityType: "project" },
    select: { entityId: true },
  });
  const favoriteProjectIds = new Set(favoriteProjects.map((f) => f.entityId));

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Projekte"
    >
      <div className="py-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projekte</h1>
            <p className="mt-1 text-sm text-muted-foreground">Der Index aller Projekte in diesem Workspace.</p>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="size-4" />
              Neues Projekt
            </Link>
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border py-14 text-center">
            <h3 className="font-semibold">Noch keine Projekte angelegt</h3>
            <p className="max-w-xs text-sm text-muted-foreground">Leg dein erstes Projekt an, um Tasks zu verfolgen.</p>
            <Button asChild className="mt-2">
              <Link href="/projects/new">
                <Plus className="size-4" />
                Neues Projekt
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Fortschritt</TableHead>
                  <TableHead>Angelegt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ project, progress }) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <FavoriteButton
                        entityType="project"
                        entityId={project.id}
                        initialFavorited={favoriteProjectIds.has(project.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/projects/${project.id}/list`} className="font-semibold hover:text-primary hover:underline">
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{project._count.taskLinks}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progress.percent} className="w-20" />
                        <span className="text-xs text-muted-foreground">{progress.percent}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{project.createdAt.toLocaleDateString("de-DE")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShellNextElite>
  );
}
