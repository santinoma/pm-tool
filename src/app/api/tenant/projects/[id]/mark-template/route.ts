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
  if (!body || typeof body.isTemplate !== "boolean") {
    return NextResponse.json({ error: "isTemplate (boolean) ist erforderlich." }, { status: 400 });
  }

  const project = await context.tenantDb.project.update({
    where: { id },
    data: { isTemplate: body.isTemplate },
  });
  return NextResponse.json({ project });
}
