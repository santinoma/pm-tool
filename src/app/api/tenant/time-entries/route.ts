import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { getOrCreateTimeTrackingPolicy } from "@/tenant/timeTracking/policy";
import { validateAgainstPolicy } from "@/tenant/timeTracking/policyValidation";
import { computeDurationMinutes, validateEntryTarget } from "@/tenant/timeTracking/duration";
import { computeEntryCost } from "@/tenant/timeTracking/entryCost";
import { computeEffectiveUnitPrice, isOverrunBlocked, resolveBaseRate } from "@/tenant/budgeting/servicePricing";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { resolveProjectIdsForTask } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess, assertAnyProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { recordActivity } from "@/tenant/notifications/recordActivity";
import { resolveInitialTimeEntryState } from "@/tenant/timeTracking/entryLifecycle";
import { assertPeriodNotLocked } from "@/tenant/financials/monthClosing";
import type { PrismaClient } from "@/generated/tenant-client/client.js";

/**
 * Prüft eine geplante Buchung gegen die org-weite Time-Tracking-Policy
 * (Tages-Limit / Wochenend-Sperre / Überschneidungs-Sperre). Lädt nur bei
 * Bedarf bestehende Einträge desselben Kalendertags (UTC) — Manuelle
 * Dauer-Einträge haben kein `startedAt`, daher `createdAt` als Ersatzdatum
 * (siehe `getEntryDate` in tenant/timeTracking/approval.ts für dasselbe Muster).
 */
async function validateBookingAgainstPolicy(
  tenantDb: PrismaClient,
  targetUserId: string,
  entry: { startedAt: Date | null; endedAt: Date | null; durationMinutes: number },
): Promise<string | null> {
  const policy = await getOrCreateTimeTrackingPolicy(tenantDb);
  if (policy.maxDailyHours === null && !policy.blockWeekends && !policy.blockOverlaps) {
    return null;
  }

  const referenceDate = entry.startedAt ?? new Date();
  const dayStart = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()),
  );
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const existing = await tenantDb.timeEntry.findMany({
    where: {
      userId: targetUserId,
      OR: [
        { startedAt: { gte: dayStart, lt: dayEnd } },
        { startedAt: null, createdAt: { gte: dayStart, lt: dayEnd } },
      ],
    },
    select: { startedAt: true, endedAt: true, durationMinutes: true, createdAt: true },
  });

  const result = validateAgainstPolicy(
    { startedAt: entry.startedAt ?? referenceDate, endedAt: entry.endedAt, durationMinutes: entry.durationMinutes },
    existing.map((e) => ({ startedAt: e.startedAt ?? e.createdAt, endedAt: e.endedAt, durationMinutes: e.durationMinutes })),
    policy,
  );
  return result.valid ? null : (result.error ?? "Buchung verstößt gegen die Time-Tracking-Policy.");
}

/**
 * Löst `onBehalfOfUserId` auf: nur owner/admin dürfen für andere Nutzer buchen.
 * Bei Buchung für sich selbst (Feld fehlt oder == eigene id) bleibt das
 * Verhalten unverändert (kein `loggedForUserId`-Audit-Eintrag nötig).
 */
async function resolveBookingTarget(
  tenantDb: PrismaClient,
  actingUser: { id: string; role: "owner" | "admin" | "member" | "client" },
  body: Record<string, unknown>,
): Promise<{ targetUserId: string; loggedForUserId: string | null } | NextResponse> {
  const onBehalfOfUserId = typeof body.onBehalfOfUserId === "string" && body.onBehalfOfUserId.length > 0
    ? body.onBehalfOfUserId
    : null;

  if (!onBehalfOfUserId || onBehalfOfUserId === actingUser.id) {
    return { targetUserId: actingUser.id, loggedForUserId: null };
  }

  if (!canManageMembers(actingUser.role)) {
    return NextResponse.json(
      { error: "Keine Berechtigung, Zeit für andere Nutzer zu buchen." },
      { status: 403 },
    );
  }

  const targetUser = await tenantDb.user.findUnique({ where: { id: onBehalfOfUserId } });
  if (!targetUser) {
    return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
  }

  return { targetUserId: onBehalfOfUserId, loggedForUserId: actingUser.id };
}

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const isPrivileged = canManageMembers(context.currentUser.role);
  // Ohne Manager-Rechte darf über diesen Endpunkt ausschließlich das eigene
  // Zeitprotokoll eingesehen werden — sonst würde `mine=false` alle
  // Zeiteinträge tenant-weit offenlegen, auch aus Projekten ohne Mitgliedschaft.
  const mineOnly = isPrivileged ? searchParams.get("mine") === "true" : true;

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

  const target = await resolveBookingTarget(context.tenantDb, context.currentUser, body);
  if (target instanceof NextResponse) return target;
  const { targetUserId, loggedForUserId } = target;

  if (typeof body.budgetSectionId === "string") {
    return handleSectionEntry(context.tenantDb, targetUserId, loggedForUserId, body);
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
  const denied = taskId
    ? await assertAnyProjectAccess(context.tenantDb, context.currentUser, await resolveProjectIdsForTask(context.tenantDb, taskId))
    : projectId
      ? await assertSingleProjectAccess(context.tenantDb, context.currentUser, projectId)
      : null;
  if (denied) return denied;

  const settings = await getOrCreateTenantSettings(context.tenantDb);
  const validation = validateEntryTarget({ taskId, projectId }, settings.allowProjectLevelTimeEntries);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const roundedDuration = Math.round(durationMinutes);
  // `date` erlaubt das Buchen für einen zurückliegenden Tag (z.B. vergessene
  // Stunden von gestern) — ohne dieses Feld wurde die Policy-Prüfung
  // (blockWeekends) bislang immer gegen "heute" statt gegen das eigentlich
  // gemeinte Datum geprüft, unabhängig davon, welches Datum der Aufrufer im
  // Sinn hatte. Fällt `date` weg, bleibt das bisherige Verhalten (heute).
  const entryDate = typeof body.date === "string" ? new Date(body.date) : null;
  if (typeof body.date === "string" && (!entryDate || Number.isNaN(entryDate.getTime()))) {
    return NextResponse.json({ error: "date ist kein gültiges Datum." }, { status: 400 });
  }
  const policyError = await validateBookingAgainstPolicy(context.tenantDb, targetUserId, {
    startedAt: entryDate,
    endedAt: null,
    durationMinutes: roundedDuration,
  });
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  const lockError = await assertPeriodNotLocked(context.tenantDb, entryDate ?? new Date());
  if (lockError) {
    return NextResponse.json({ error: lockError }, { status: 409 });
  }

  const initialState = await resolveInitialTimeEntryState(context.tenantDb);
  const entry = await context.tenantDb.timeEntry.create({
    data: {
      userId: targetUserId,
      loggedForUserId,
      taskId,
      projectId,
      durationMinutes: roundedDuration,
      startedAt: entryDate,
      description: typeof body.description === "string" ? body.description : null,
      ...initialState,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}

export async function handleSectionEntry(
  tenantDb: PrismaClient,
  userId: string,
  loggedForUserId: string | null,
  body: Record<string, unknown>,
) {
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
  if (!section.trackTime) {
    return NextResponse.json(
      { error: "Time-Tracking ist für diese Section deaktiviert." },
      { status: 409 },
    );
  }
  if (section.budget.deliveredAt) {
    return NextResponse.json(
      { error: "Budget wurde bereits geliefert, keine weiteren Buchungen möglich." },
      { status: 409 },
    );
  }
  if (!section.assignees.some((a) => a.userId === userId)) {
    return NextResponse.json(
      { error: "Du bist dieser Section nicht zugeordnet." },
      { status: 403 },
    );
  }

  const lockError = await assertPeriodNotLocked(tenantDb, startedAt);
  if (lockError) {
    return NextResponse.json({ error: lockError }, { status: 409 });
  }

  const durationMinutes = computeDurationMinutes(startedAt, endedAt);
  const assigneeHourlyRate = section.assignees.find((a) => a.userId === userId)?.hourlyRate ?? null;
  const baseRate = resolveBaseRate(section.budget.billableRateStrategy, section.price, assigneeHourlyRate, section.budget.billableRate);
  const effectiveRate = computeEffectiveUnitPrice(baseRate, section.discountPercent, section.markupPercent);
  const amount = computeEntryCost(durationMinutes, effectiveRate);

  if (isOverrunBlocked(section.budgetUsed, amount, section.guaranteedMaxPrice, section.blockOverrun)) {
    return NextResponse.json(
      { error: "Diese Buchung würde das Guaranteed-Maximum-Price-Limit dieser Section überschreiten." },
      { status: 409 },
    );
  }

  const policyError = await validateBookingAgainstPolicy(tenantDb, userId, { startedAt, endedAt, durationMinutes });
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  const initialState = await resolveInitialTimeEntryState(tenantDb);
  const { entry, updatedSection } = await tenantDb.$transaction(async (tx) => {
    const created = await tx.timeEntry.create({
      data: {
        userId,
        loggedForUserId,
        projectId: section.budget.projectId,
        budgetSectionId,
        startedAt,
        endedAt,
        durationMinutes,
        amount,
        description: typeof body.description === "string" ? body.description : null,
        ...initialState,
      },
    });
    const updated = await tx.budgetSection.update({
      where: { id: budgetSectionId },
      data: { budgetUsed: { increment: amount } },
    });
    return { entry: created, updatedSection: updated };
  });

  // Warnschwelle: sobald die neue Auslastung die konfigurierte Schwelle
  // erreicht/überschreitet und noch keine Warnung verschickt wurde, den
  // Budget-Owner einmalig benachrichtigen. `warningNotifiedAt` verhindert,
  // dass jede weitere Buchung oberhalb der Schwelle erneut benachrichtigt.
  const threshold = section.warningThresholdPercent;
  if (threshold !== null && threshold !== undefined && !section.warningNotifiedAt) {
    const budgetTotal =
      updatedSection.quantity *
      computeEffectiveUnitPrice(updatedSection.price, updatedSection.discountPercent, updatedSection.markupPercent);
    const newUsagePercent = budgetTotal > 0 ? (updatedSection.budgetUsed / budgetTotal) * 100 : 0;
    const previousUsagePercent = budgetTotal > 0 ? (section.budgetUsed / budgetTotal) * 100 : 0;
    if (previousUsagePercent < threshold && newUsagePercent >= threshold) {
      await tenantDb.budgetSection.update({
        where: { id: budgetSectionId },
        data: { warningNotifiedAt: new Date() },
      });
      await recordActivity(tenantDb, {
        projectId: section.budget.projectId,
        actorId: userId,
        type: "budget_section_updated",
        summary: `Budget-Sektion „${section.name}“ hat ${threshold}% des Budgets erreicht.`,
        budgetId: section.budgetId,
        mentionedUserIds: [section.budget.ownerId],
      });
    }
  }

  return NextResponse.json({ entry }, { status: 201 });
}
