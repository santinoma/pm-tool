import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");

  const entries = await context.tenantDb.timeEntry.findMany({
    where: {
      approvalStatus: "pending",
      ...(projectId ? { projectId } : {}),
    },
    include: { user: true, task: true, project: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ entries });
}
