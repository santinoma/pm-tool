import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_TYPES = ["vacation", "sick"];

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const wantsAll = new URL(request.url).searchParams.get("all") === "true";
  if (wantsAll && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const requests = await context.tenantDb.absenceRequest.findMany({
    where: wantsAll ? { status: "pending" } : { userId: context.currentUser.id },
    include: { user: true, reviewedBy: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !VALID_TYPES.includes(body.type) || typeof body.startDate !== "string" || typeof body.endDate !== "string") {
    return NextResponse.json(
      { error: "type ('vacation'|'sick'), startDate und endDate sind erforderlich." },
      { status: 400 },
    );
  }

  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate.getTime() < startDate.getTime()) {
    return NextResponse.json({ error: "Ungültiger Zeitraum." }, { status: 400 });
  }

  const created = await context.tenantDb.absenceRequest.create({
    data: {
      userId: context.currentUser.id,
      type: body.type,
      startDate,
      endDate,
      note: typeof body.note === "string" ? body.note : null,
    },
  });
  return NextResponse.json({ request: created }, { status: 201 });
}
