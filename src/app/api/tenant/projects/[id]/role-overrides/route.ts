import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const overrides = await context.tenantDb.projectRoleOverride.findMany({
    where: { projectId: id },
    include: { user: true, customRole: true },
  });
  return NextResponse.json({ overrides });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.userId !== "string" || typeof body.customRoleId !== "string") {
    return NextResponse.json({ error: "userId und customRoleId sind erforderlich." }, { status: 400 });
  }

  const override = await context.tenantDb.projectRoleOverride.upsert({
    where: { projectId_userId: { projectId: id, userId: body.userId } },
    create: { projectId: id, userId: body.userId, customRoleId: body.customRoleId },
    update: { customRoleId: body.customRoleId },
    include: { user: true, customRole: true },
  });
  return NextResponse.json({ override }, { status: 201 });
}
