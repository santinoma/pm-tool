import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { wouldRemoveLastOwner, type RoleName } from "@/tenant/auth/roleGuard";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

const VALID_ROLES: RoleName[] = ["owner", "admin", "member"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManageRoles = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "members_manage_roles",
  );
  if (!canManageRoles) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !VALID_ROLES.includes(body.role)) {
    return NextResponse.json({ error: "Ungültige Rolle." }, { status: 400 });
  }

  const allUsers = await context.tenantDb.user.findMany({ select: { id: true, role: true } });
  if (wouldRemoveLastOwner(allUsers, id, body.role)) {
    return NextResponse.json(
      { error: "Der letzte Owner kann nicht degradiert werden." },
      { status: 409 },
    );
  }

  const updated = await context.tenantDb.user.update({
    where: { id },
    data: { role: body.role },
  });
  return NextResponse.json({ user: updated });
}
