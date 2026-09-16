import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.projectId !== "string") {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }

  const attachment = await context.tenantDb.projectCustomField
    .create({ data: { fieldId: id, projectId: body.projectId } })
    .catch(() => null);
  if (!attachment) {
    return NextResponse.json({ error: "Feld ist bereits an dieses Projekt angehängt." }, { status: 409 });
  }
  return NextResponse.json({ attachment }, { status: 201 });
}
