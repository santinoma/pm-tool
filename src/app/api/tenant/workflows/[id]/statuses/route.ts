import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_CATEGORIES = ["not_started", "started", "done"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const statuses = await context.tenantDb.workflowStatus.findMany({
    where: { workflowId: id },
    orderBy: { position: "asc" },
  });
  return NextResponse.json({ statuses });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    body.name.trim().length === 0 ||
    !VALID_CATEGORIES.includes(body.category)
  ) {
    return NextResponse.json({ error: "Name und eine gültige Kategorie sind erforderlich." }, { status: 400 });
  }

  const existing = await context.tenantDb.workflowStatus.findMany({ where: { workflowId: id } });
  const nextPosition = existing.length > 0 ? Math.max(...existing.map((s) => s.position)) + 1 : 0;

  const status = await context.tenantDb.workflowStatus.create({
    data: { workflowId: id, name: body.name, category: body.category, position: nextPosition },
  });
  return NextResponse.json({ status }, { status: 201 });
}
