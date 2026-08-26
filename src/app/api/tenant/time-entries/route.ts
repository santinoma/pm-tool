import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { computeDurationMinutes, validateEntryTarget } from "@/tenant/timeTracking/duration";
import { computeEntryCost } from "@/tenant/timeTracking/entryCost";
import type { PrismaClient } from "@/generated/tenant-client/client.js";

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const mineOnly = searchParams.get("mine") === "true";

  const entries = await context.tenantDb.timeEntry.findMany({
    where: mineOnly ? { userId: context.currentUser.id } : undefined,
    include: { task: true, project: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (typeof body.budgetSectionId === "string") {
    return handleSectionEntry(context.tenantDb, context.currentUser.id, body);
  }

  const taskId = typeof body.taskId === "string" ? body.taskId : null;
  const projectId = typeof body.projectId === "string" ? body.projectId : null;
  const durationMinutes = Number(body.durationMinutes);

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json(
      { error: "durationMinutes muss eine positive Zahl sein." },
      { status: 400 },
    );
  }

  const settings = await getOrCreateTenantSettings(context.tenantDb);
  const validation = validateEntryTarget({ taskId, projectId }, settings.allowProjectLevelTimeEntries);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const entry = await context.tenantDb.timeEntry.create({
    data: {
      userId: context.currentUser.id,
      taskId,
      projectId,
      durationMinutes: Math.round(durationMinutes),
      description: typeof body.description === "string" ? body.description : null,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}

async function handleSectionEntry(tenantDb: PrismaClient, userId: string, body: Record<string, unknown>) {
  const budgetSectionId = body.budgetSectionId as string;
  const startedAt = typeof body.startedAt === "string" ? new Date(body.startedAt) : null;
  const endedAt = typeof body.endedAt === "string" ? new Date(body.endedAt) : null;

  if (!startedAt || !endedAt || Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
    return NextResponse.json({ error: "startedAt und endedAt sind erforderlich." }, { status: 400 });
  }
  if (endedAt.getTime() <= startedAt.getTime()) {
    return NextResponse.json({ error: "endedAt muss nach startedAt liegen." }, { status: 400 });
  }

  const section = await tenantDb.budgetSection.findUnique({
    where: { id: budgetSectionId },
    include: { assignees: true, budget: true },
  });
  if (!section) {
    return NextResponse.json({ error: "Section nicht gefunden." }, { status: 404 });
  }
  if (!section.assignees.some((a) => a.userId === userId)) {
    return NextResponse.json(
      { error: "Du bist dieser Section nicht zugeordnet." },
      { status: 403 },
    );
  }

  const durationMinutes = computeDurationMinutes(startedAt, endedAt);
  const amount = computeEntryCost(durationMinutes, section.price);

  const entry = await tenantDb.$transaction(async (tx) => {
    const created = await tx.timeEntry.create({
      data: {
        userId,
        projectId: section.budget.projectId,
        budgetSectionId,
        startedAt,
        endedAt,
        durationMinutes,
        amount,
        description: typeof body.description === "string" ? body.description : null,
      },
    });
    await tx.budgetSection.update({
      where: { id: budgetSectionId },
      data: { budgetUsed: { increment: amount } },
    });
    return created;
  });

  return NextResponse.json({ entry }, { status: 201 });
}
