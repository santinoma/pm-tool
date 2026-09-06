import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { executeRuleActions } from "@/tenant/automations/runAutomations";
import { computeAutomationPeriodKey } from "@/tenant/automations/scheduleDueCheck";
import { assertAnyProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { resolveProjectIdsForTask } from "@/tenant/projectAccess/resolveProjectMembership";

/**
 * Manuelles Testen einer Regel (entspricht Productives "Run Now"-Button).
 * Erfordert eine taskId, gegen die die Aktionen ausgeführt werden — echte
 * unbeaufsichtigte Massenausführung zeitbasierter Regeln über beliebige
 * Tasks hinweg bräuchte eine Bulk-Auswahllogik (Productives "Check if"-
 * Schritt), die bewusst nicht Teil dieser Erweiterung ist.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManageAutomations = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "automations_manage",
  );
  if (!canManageAutomations) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.taskId !== "string") {
    return NextResponse.json({ error: "taskId ist erforderlich." }, { status: 400 });
  }
  const denied = await assertAnyProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdsForTask(context.tenantDb, body.taskId),
  );
  if (denied) return denied;

  const rule = await context.tenantDb.automationRule.findUnique({
    where: { id },
    include: { actions: { orderBy: { position: "asc" } } },
  });
  if (!rule) {
    return NextResponse.json({ error: "Regel nicht gefunden." }, { status: 404 });
  }

  const primaryLink = await context.tenantDb.taskProject.findFirst({
    where: { taskId: body.taskId, isPrimary: true },
    select: { projectId: true },
  });
  if (!primaryLink) {
    return NextResponse.json({ error: "Task hat kein Primärprojekt." }, { status: 400 });
  }

  const triggerType = rule.triggers[0];
  const activityEvent = await context.tenantDb.activityEvent.create({
    data: {
      projectId: primaryLink.projectId,
      actorId: context.currentUser.id,
      type: "task_updated",
      summary: `Automation „${rule.name}“ manuell ausgeführt`,
    },
  });

  await executeRuleActions(
    context.tenantDb,
    rule.actions,
    body.taskId,
    activityEvent.id,
    context.currentUser.id,
  );

  if (triggerType === "time_daily" || triggerType === "time_weekly") {
    await context.tenantDb.automationRule.update({
      where: { id },
      data: { lastRunPeriodKey: computeAutomationPeriodKey(new Date(), triggerType) },
    });
  }

  return NextResponse.json({ ok: true });
}
