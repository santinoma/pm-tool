import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const members = await context.tenantDb.projectMember.findMany({
    where: { projectId: id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ members });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.userId !== "string") {
    return NextResponse.json({ error: "userId ist erforderlich." }, { status: 400 });
  }

  const member = await context.tenantDb.projectMember.upsert({
    where: { projectId_userId: { projectId: id, userId: body.userId } },
    create: { projectId: id, userId: body.userId },
    update: {},
    include: { user: true },
  });
  return NextResponse.json({ member }, { status: 201 });
}
