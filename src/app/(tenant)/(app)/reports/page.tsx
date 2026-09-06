import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const reports = await context.tenantDb.savedReport.findMany({
    where: { ownerId: context.currentUser.id },
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true, email: true } } },
  });

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Reports"
    >
      <ReportsClient
        reports={reports.map((report) => ({
          id: report.id,
          name: report.name,
          category: report.category,
          dataSource: report.dataSource,
          ownerLabel: report.owner.name ?? report.owner.email,
          createdAt: report.createdAt.toISOString(),
        }))}
      />
    </AppShellNextElite>
  );
}
