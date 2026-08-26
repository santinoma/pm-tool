import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { computePeriodKey } from "@/tenant/checkIns/period";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const responses = await context.tenantDb.checkInResponse.findMany({
    where: { scheduleId: id },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ responses });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.answer !== "string" || body.answer.trim().length === 0) {
    return NextResponse.json({ error: "answer ist erforderlich." }, { status: 400 });
  }

  const schedule = await context.tenantDb.checkInSchedule.findUnique({ where: { id } });
  if (!schedule) {
    return NextResponse.json({ error: "Schedule nicht gefunden." }, { status: 404 });
  }

  const periodKey = computePeriodKey(new Date(), schedule.recurrence);

  const response = await context.tenantDb.checkInResponse.upsert({
    where: {
      scheduleId_userId_periodKey: { scheduleId: id, userId: context.currentUser.id, periodKey },
    },
    create: { scheduleId: id, userId: context.currentUser.id, periodKey, answer: body.answer },
    update: { answer: body.answer },
  });

  return NextResponse.json({ response });
}
