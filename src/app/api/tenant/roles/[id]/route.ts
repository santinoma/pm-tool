import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { PERMISSION_KEYS, resolveWithDependencies } from "@/tenant/permissions/permissionCatalog";
import { recordAuditEntry } from "@/tenant/auditLog/recordAuditEntry";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const target = await context.tenantDb.customRole.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Rolle nicht gefunden." }, { status: 404 });
  }
  // T402: die acht Productive-Standard-Permission-Sets sind fest — nicht
  // umbenennbar, nicht in ihren Rechten veränderbar (analog zu Productive:
  // "System sets cannot be edited directly").
  if (target.isSystem) {
    return NextResponse.json({ error: "Standard-Permission-Sets können nicht bearbeitet werden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const validKeys: readonly string[] = PERMISSION_KEYS;
  const selectedPermissions = Array.isArray(body.permissions)
    ? body.permissions.filter((key: unknown) => typeof key === "string" && validKeys.includes(key))
    : undefined;
  const permissions = selectedPermissions ? resolveWithDependencies(selectedPermissions) : undefined;

  const role = await context.tenantDb.customRole.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      permissions,
    },
  });

  if (permissions !== undefined) {
    try {
      await recordAuditEntry(context.tenantDb, {
        actorId: context.currentUser.id,
        action: "custom_role_permissions_changed",
        entityType: "CustomRole",
        entityId: role.id,
        summary: `Berechtigungen der Rolle "${role.name}" geändert: [${role.permissions.join(", ")}]`,
      });
    } catch {
      // Audit-Logging darf die eigentliche Aktion nie blockieren.
    }
  }

  return NextResponse.json({ role });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const target = await context.tenantDb.customRole.findUnique({ where: { id } });
  if (target?.isSystem) {
    return NextResponse.json({ error: "Standard-Permission-Sets können nicht gelöscht werden." }, { status: 403 });
  }

  await context.tenantDb.user.updateMany({ where: { customRoleId: id }, data: { customRoleId: null } });
  await context.tenantDb.projectRoleOverride.deleteMany({ where: { customRoleId: id } });
  await context.tenantDb.customRole.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
