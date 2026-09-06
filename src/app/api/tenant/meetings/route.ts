import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const meetings = await context.tenantDb.meeting.findMany({
    where: isPrivileged ? undefined : { project: { members: { some: { userId: context.currentUser.id } } } },
    orderBy: { scheduledAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ meetings });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
  }
  if (typeof body.scheduledAt !== "string" || Number.isNaN(Date.parse(body.scheduledAt))) {
    return NextResponse.json({ error: "scheduledAt muss ein gültiges Datum sein." }, { status: 400 });
  }

  const meeting = await context.tenantDb.meeting.create({
    data: {
      title: body.title,
      description: typeof body.description === "string" ? body.description : null,
      scheduledAt: new Date(body.scheduledAt),
      projectId: typeof body.projectId === "string" ? body.projectId : null,
      createdById: context.currentUser.id,
    },
    include: { project: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ meeting }, { status: 201 });
}
