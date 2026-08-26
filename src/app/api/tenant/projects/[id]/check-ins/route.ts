import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_RECURRENCES = ["daily", "weekly"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const schedules = await context.tenantDb.checkInSchedule.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ schedules });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.question !== "string" || !VALID_RECURRENCES.includes(body.recurrence)) {
    return NextResponse.json(
      { error: "question und recurrence (daily/weekly) sind erforderlich." },
      { status: 400 },
    );
  }

  const schedule = await context.tenantDb.checkInSchedule.create({
    data: {
      projectId: id,
      question: body.question,
      recurrence: body.recurrence,
      dayOfWeek: typeof body.dayOfWeek === "number" ? body.dayOfWeek : null,
    },
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
