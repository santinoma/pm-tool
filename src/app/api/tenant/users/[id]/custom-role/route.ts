import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { isCustomRoleAllowedForEmploymentType } from "@/tenant/auth/employmentType";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
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
