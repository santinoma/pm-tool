import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const pipelines = await context.tenantDb.pipeline.findMany({
    include: { _count: { select: { statuses: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ pipelines });
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
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Name ist erforderlich." }, { status: 400 });
  }

  const pipeline = await context.tenantDb.pipeline.create({
    data: {
      name: body.name,
      statuses: {
        create: [
          { name: "Lead", category: "open", position: 0, defaultProbability: 10 },
          { name: "Won", category: "won", position: 1, defaultProbability: 100 },
          { name: "Lost", category: "lost", position: 2, defaultProbability: 0 },
        ],
      },
    },
    include: { statuses: true },
  });
  return NextResponse.json({ pipeline }, { status: 201 });
}
