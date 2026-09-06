import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { ReportBuilderClient } from "./ReportBuilderClient";

export const dynamic = "force-dynamic";

export default async function ReportBuilderPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const [projects, savedReports] = await Promise.all([
    context.tenantDb.project.findMany({
      where: isPrivileged ? undefined : { members: { some: { userId: context.currentUser.id } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    context.tenantDb.savedReport.findMany({
      where: { ownerId: context.currentUser.id },
      orderBy: { createdAt: "desc" },
    }),
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
      pageTitle="Berichte erstellen"
    >
      <ReportBuilderClient
        canRunOrgWide={isPrivileged}
        projects={projects}
        initialSavedReports={savedReports.map((report) => ({
          id: report.id,
          name: report.name,
          category: report.category,
          dataSource: report.dataSource,
          filterConfig: report.filterConfig as { field: string; operator: string; value: unknown }[],
          groupByConfig: report.groupByConfig as { field: string } | null,
          projectId: report.projectId,
          chartType: report.chartType,
        }))}
      />
    </AppShellNextElite>
  );
}
