import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { isCustomRoleAllowedForEmploymentType } from "@/tenant/auth/employmentType";
import { hasEffectivePermission, resolveEffectivePermissions } from "@/tenant/permissions/resolvePermissions";
import type { PermissionKey } from "@/tenant/permissions/permissionCatalog";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  // T403: `members_manage_roles` statt der groben owner/admin-Prüfung —
  // Manager/Profitability Manager haben dieses Recht seit T403 auch, die
  // Stufen-Beschränkung ("darf nicht zu Admin/Profitability Manager
  // befördern") wird unten über den Teilmengen-Check auf den tatsächlich
  // vergebenen Rechten durchgesetzt, nicht über eine hartkodierte Tabelle.
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
  if (!body || (body.customRoleId !== null && typeof body.customRoleId !== "string")) {
    return NextResponse.json({ error: "customRoleId (string oder null) ist erforderlich." }, { status: 400 });
  }

  if (body.customRoleId) {
    const role = await context.tenantDb.customRole.findUnique({ where: { id: body.customRoleId } });
    if (!role) {
      return NextResponse.json({ error: "Custom Role nicht gefunden." }, { status: 404 });
    }
    // T403: darf nur ein Set/eine Rolle vergeben, deren Rechte eine
    // Teilmenge der eigenen effektiven Rechte sind — niemand kann so mehr
    // Rechte vergeben, als er selbst hat (verhindert z. B., dass ein
    // Manager jemanden zum Admin oder Profitability Manager befördert,
    // ohne eine separate, hartkodierte Stufen-Tabelle zu brauchen).
    const actorPermissions = await resolveEffectivePermissions(context.tenantDb, context.currentUser, context.entitledFeatures);
    const grantsMoreThanActorHas = role.permissions.some((key) => !actorPermissions.has(key as PermissionKey));
    if (grantsMoreThanActorHas) {
      return NextResponse.json(
        { error: "Du kannst keine Rolle mit mehr Rechten vergeben, als du selbst hast." },
        { status: 403 },
      );
    }
    const target = await context.tenantDb.user.findUnique({ where: { id }, select: { employmentType: true } });
    if (target && !isCustomRoleAllowedForEmploymentType(target.employmentType)) {
      return NextResponse.json(
        { error: "Contractors haben ein festes Berechtigungsprofil und können keine Custom Role erhalten." },
        { status: 400 },
      );
    }
  }

  const updated = await context.tenantDb.user.update({
    where: { id },
    data: { customRoleId: body.customRoleId },
  });
  return NextResponse.json({ user: updated });
}
