import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { isFilterGroup, type FilterGroup } from "@/tenant/views/filterEngine";

const VALID_TRIGGERS = ["task_created", "task_status_changed", "task_updated", "task_commented", "time_daily", "time_weekly"];
const VALID_ACTION_TYPES = [
  "assign_user",
  "notify_user",
  "change_status",
  "add_comment",
  "create_task",
  "create_subtask",
  "create_todo",
  "send_email",
];
const NEW_ITEM_ACTION_TYPES = ["create_task", "create_subtask", "create_todo"];

/** T306: conditionConfig is a FilterGroup (see filterEngine.ts) — only shallow-validated here (a full-depth check would duplicate the type itself); malformed values are structurally inert since evaluateFilterNode's isFilterGroup guard falls through safely. */
function isValidConditionConfig(value: unknown): value is FilterGroup | null {
  return value === null || value === undefined || isFilterGroup(value as FilterGroup);
}

interface ActionInput {
  type: string;
  targetUserId?: string;
  targetStatusId?: string;
  commentBody?: string;
  newItemTitle?: string;
}

function validateActions(actions: unknown): { valid: boolean; reason?: string } {
  if (!Array.isArray(actions) || actions.length === 0) {
    return { valid: false, reason: "Mindestens eine Aktion ist erforderlich." };
  }
  for (const action of actions as ActionInput[]) {
    if (!VALID_ACTION_TYPES.includes(action?.type)) {
      return { valid: false, reason: `Ungültiger Aktionstyp: ${action?.type}.` };
    }
    if ((action.type === "assign_user" || action.type === "notify_user") && typeof action.targetUserId !== "string") {
      return { valid: false, reason: `${action.type} braucht targetUserId.` };
    }
    if (action.type === "change_status" && typeof action.targetStatusId !== "string") {
      return { valid: false, reason: "change_status braucht targetStatusId." };
    }
    if (action.type === "add_comment" && (typeof action.commentBody !== "string" || action.commentBody.trim().length === 0)) {
      return { valid: false, reason: "add_comment braucht commentBody." };
    }
    if (
      NEW_ITEM_ACTION_TYPES.includes(action.type) &&
      (typeof action.newItemTitle !== "string" || action.newItemTitle.trim().length === 0)
    ) {
      return { valid: false, reason: `${action.type} braucht newItemTitle.` };
    }
  }
  return { valid: true };
}

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const rules = await context.tenantDb.automationRule.findMany({
    include: {
      actions: { include: { targetUser: true, targetStatus: true }, orderBy: { position: "asc" } },
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
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
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }
  const triggers: string[] = Array.isArray(body.triggers) ? body.triggers : [];
  if (triggers.length === 0 || !triggers.every((t) => VALID_TRIGGERS.includes(t))) {
    return NextResponse.json(
      { error: `triggers muss eine nicht-leere Liste aus ${VALID_TRIGGERS.join(", ")} sein.` },
      { status: 400 },
    );
  }
  if (!isValidConditionConfig(body.conditionConfig)) {
    return NextResponse.json({ error: "Ungültige conditionConfig." }, { status: 400 });
  }
  const hasTimeTrigger = triggers.includes("time_daily") || triggers.includes("time_weekly");
  if (triggers.includes("time_weekly") && (body.scheduleWeekday === undefined || body.scheduleWeekday === null)) {
    return NextResponse.json({ error: "time_weekly braucht scheduleWeekday (0-6)." }, { status: 400 });
  }

  const actionsValidation = validateActions(body.actions);
  if (!actionsValidation.valid) {
    return NextResponse.json({ error: actionsValidation.reason }, { status: 400 });
  }
  const actions = body.actions as ActionInput[];

  const projectIds: string[] = Array.isArray(body.projectIds)
    ? body.projectIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  const rule = await context.tenantDb.automationRule.create({
    data: {
      name: body.name,
      triggers: triggers as never,
      conditionConfig: (body.conditionConfig ?? null) as never,
      scheduleTime: hasTimeTrigger && typeof body.scheduleTime === "string" ? body.scheduleTime : null,
      scheduleWeekday: triggers.includes("time_weekly") ? body.scheduleWeekday : null,
      projectIds,
      createdById: context.currentUser.id,
      actions: {
        create: actions.map((action, index) => ({
          type: action.type as never,
          targetUserId: action.targetUserId ?? null,
          targetStatusId: action.targetStatusId ?? null,
          commentBody: action.commentBody ?? null,
          newItemTitle: action.newItemTitle ?? null,
          position: index,
        })),
      },
    },
    include: { actions: true },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
