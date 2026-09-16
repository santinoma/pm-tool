import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const lostReasons = await context.tenantDb.lostReason.findMany({ orderBy: { label: "asc" } });
  return NextResponse.json({ lostReasons });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.label !== "string" || body.label.trim().length === 0) {
    return NextResponse.json({ error: "label ist erforderlich." }, { status: 400 });
  }

  const lostReason = await context.tenantDb.lostReason.create({ data: { label: body.label.trim() } }).catch(() => null);
  if (!lostReason) {
    return NextResponse.json({ error: "Dieser Lost-Reason existiert bereits." }, { status: 409 });
  }
  return NextResponse.json({ lostReason }, { status: 201 });
}
