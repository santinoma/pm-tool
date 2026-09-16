import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const rateCards = await context.tenantDb.rateCard.findMany({
    include: { client: { select: { name: true } }, _count: { select: { items: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ rateCards });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }

  const rateCard = await context.tenantDb.rateCard.create({
    data: {
      name: body.name.trim(),
      clientId: typeof body.clientId === "string" ? body.clientId : null,
    },
  });
  return NextResponse.json({ rateCard }, { status: 201 });
}
