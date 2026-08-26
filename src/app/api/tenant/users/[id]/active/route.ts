import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers, wouldDeactivateLastOwner } from "@/tenant/auth/roleGuard";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive (boolean) ist erforderlich." }, { status: 400 });
  }

  if (id === context.currentUser.id) {
    return NextResponse.json({ error: "Du kannst dich nicht selbst deaktivieren." }, { status: 400 });
  }

  if (!body.isActive) {
    const allUsers = await context.tenantDb.user.findMany({
      select: { id: true, role: true, isActive: true },
    });
    if (wouldDeactivateLastOwner(allUsers, id)) {
      return NextResponse.json(
        { error: "Der letzte aktive Owner kann nicht deaktiviert werden." },
        { status: 409 },
      );
    }
  }

  const user = await context.tenantDb.user.update({
    where: { id },
    data: { isActive: body.isActive },
  });

  return NextResponse.json({ user: { id: user.id, isActive: user.isActive } });
}
