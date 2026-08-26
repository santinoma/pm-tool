import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

const VALID_TRIGGERS = ["task_created", "task_status_changed"];
const VALID_ACTION_TYPES = ["assign_user", "notify_user"];
const VALID_STATUS_CATEGORIES = ["not_started", "started", "done"];

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const rules = await context.tenantDb.automationRule.findMany({
    include: { actions: { include: { targetUser: true }, orderBy: { position: "asc" } }, createdBy: true },
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
  if (!VALID_TRIGGERS.includes(body.trigger)) {
    return NextResponse.json({ error: `trigger muss eines von ${VALID_TRIGGERS.join(", ")} sein.` }, { status: 400 });
  }
  if (body.conditionStatusCategory != null && !VALID_STATUS_CATEGORIES.includes(body.conditionStatusCategory)) {
    return NextResponse.json({ error: "Ungültige conditionStatusCategory." }, { status: 400 });
  }
  const actions = Array.isArray(body.actions) ? body.actions : [];
  for (const action of actions) {
    if (!VALID_ACTION_TYPES.includes(action?.type) || typeof action?.targetUserId !== "string") {
      return NextResponse.json(
        { error: "Jede Aktion braucht type ('assign_user'|'notify_user') und targetUserId." },
        { status: 400 },
      );
    }
  }

  const rule = await context.tenantDb.automationRule.create({
    data: {
      name: body.name,
      trigger: body.trigger,
      conditionStatusCategory: body.trigger === "task_status_changed" ? (body.conditionStatusCategory ?? null) : null,
      createdById: context.currentUser.id,
      actions: {
        create: actions.map((action: { type: string; targetUserId: string }, index: number) => ({
          type: action.type,
          targetUserId: action.targetUserId,
          position: index,
        })),
      },
    },
    include: { actions: true },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
