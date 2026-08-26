import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { CyclesListClient } from "./CyclesListClient";

export const dynamic = "force-dynamic";

export default async function CyclesListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const cycles = await context.tenantDb.cycle.findMany({
    where: { projectId: id },
    orderBy: { startDate: "desc" },
  });

  return (
    <CyclesListClient
      projectId={id}
      canManage={canManageMembers(context.currentUser.role)}
      cycles={cycles.map((cycle) => ({
        id: cycle.id,
        name: cycle.name,
        startDate: cycle.startDate.toISOString().slice(0, 10),
        endDate: cycle.endDate.toISOString().slice(0, 10),
      }))}
    />
  );
}
