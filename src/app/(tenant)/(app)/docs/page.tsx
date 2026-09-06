import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { DocsClient } from "./DocsClient";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const [pages, projects] = await Promise.all([
    context.tenantDb.wikiPage.findMany({
      where: isPrivileged ? undefined : { project: { members: { some: { userId: context.currentUser.id } } } },
      orderBy: { updatedAt: "desc" },
      include: { project: { select: { id: true, name: true } }, createdBy: { select: { name: true, email: true } } },
    }),
    context.tenantDb.project.findMany({
      where: isPrivileged ? undefined : { members: { some: { userId: context.currentUser.id } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Docs"
    >
      <DocsClient
        projects={projects}
        pages={pages.map((page) => ({
          id: page.id,
          title: page.title,
          projectId: page.projectId,
          projectName: page.project.name,
          createdAt: page.createdAt.toISOString(),
          updatedAt: page.updatedAt.toISOString(),
          creatorName: page.createdBy?.name ?? page.createdBy?.email ?? null,
        }))}
      />
    </AppShellNextElite>
  );
}
