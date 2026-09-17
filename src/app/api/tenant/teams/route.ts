import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const teams = await context.tenantDb.team.findMany({
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      members: team.members.map((member) => ({ id: member.user.id, label: member.user.name ?? member.user.email })),
    })),
  });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  // Reference "Managing Teams": "Only Admins can manage teams".
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }

  const team = await context.tenantDb.team.create({ data: { name: body.name } });
  return NextResponse.json({ team }, { status: 201 });
}
