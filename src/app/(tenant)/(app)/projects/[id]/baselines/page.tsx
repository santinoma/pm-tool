import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { BaselinesListClient } from "./BaselinesListClient";

export const dynamic = "force-dynamic";

export default async function BaselinesListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const baselines = await context.tenantDb.baseline.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <BaselinesListClient
      projectId={id}
      canManage={canManageMembers(context.currentUser.role)}
      baselines={baselines.map((baseline) => ({
        id: baseline.id,
        name: baseline.name,
        createdAt: baseline.createdAt.toISOString(),
      }))}
    />
  );
}
