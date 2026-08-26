import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.weeklyCapacityHours !== "number") {
    return NextResponse.json(
      { error: "weeklyCapacityHours (number) ist erforderlich." },
      { status: 400 },
    );
  }

  const user = await context.tenantDb.user.update({
    where: { id },
    data: { weeklyCapacityHours: body.weeklyCapacityHours },
  });

  return NextResponse.json({ user: { id: user.id, weeklyCapacityHours: user.weeklyCapacityHours } });
}
