import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { PERMISSION_KEYS, resolveWithDependencies } from "@/tenant/permissions/permissionCatalog";
import { getOrCreateSystemPermissionSets } from "@/tenant/permissions/systemPermissionSets";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  await getOrCreateSystemPermissionSets(context.tenantDb);
  const roles = await context.tenantDb.customRole.findMany({ orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }] });
  return NextResponse.json({ roles });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }
  const validKeys: readonly string[] = PERMISSION_KEYS;
  const selectedPermissions = Array.isArray(body.permissions)
    ? body.permissions.filter((key: unknown) => typeof key === "string" && validKeys.includes(key))
    : [];
  const permissions = resolveWithDependencies(selectedPermissions);

  const role = await context.tenantDb.customRole.create({
    data: { name: body.name, permissions },
  });
  return NextResponse.json({ role }, { status: 201 });
}
