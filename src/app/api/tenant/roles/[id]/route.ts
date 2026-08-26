import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { PERMISSION_KEYS } from "@/tenant/permissions/permissionCatalog";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const validKeys: readonly string[] = PERMISSION_KEYS;
  const permissions = Array.isArray(body.permissions)
    ? body.permissions.filter((key: unknown) => typeof key === "string" && validKeys.includes(key))
    : undefined;

  const role = await context.tenantDb.customRole.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      permissions,
    },
  });
  return NextResponse.json({ role });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  await context.tenantDb.user.updateMany({ where: { customRoleId: id }, data: { customRoleId: null } });
  await context.tenantDb.projectRoleOverride.deleteMany({ where: { customRoleId: id } });
  await context.tenantDb.customRole.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
