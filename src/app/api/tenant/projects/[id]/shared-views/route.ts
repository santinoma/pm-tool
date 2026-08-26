import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { generateInviteToken } from "@/tenant/auth/invite";

const VALID_STATUS_CATEGORIES = ["not_started", "started", "done"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const views = await context.tenantDb.sharedView.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ views });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.statusCategoryFilter != null && !VALID_STATUS_CATEGORIES.includes(body.statusCategoryFilter)) {
    return NextResponse.json({ error: "Ungültige statusCategoryFilter." }, { status: 400 });
  }
  const expiresAt = typeof body.expiresAt === "string" ? new Date(body.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Ungültiges expiresAt." }, { status: 400 });
  }

  const view = await context.tenantDb.sharedView.create({
    data: {
      projectId: id,
      token: generateInviteToken(),
      statusCategoryFilter: body.statusCategoryFilter ?? null,
      expiresAt,
      createdById: context.currentUser.id,
    },
  });
  return NextResponse.json({ view }, { status: 201 });
}
