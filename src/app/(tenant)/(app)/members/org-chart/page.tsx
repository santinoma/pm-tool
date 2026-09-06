import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { OrgChartClient } from "./OrgChartClient";

export const dynamic = "force-dynamic";

export default async function OrgChartPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const users = await context.tenantDb.user.findMany({ orderBy: { name: "asc" } });

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
      pageTitle="Org-Chart"
    >
      <OrgChartClient
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          managerId: user.managerId,
        }))}
      />
    </AppShellNextElite>
  );
}
