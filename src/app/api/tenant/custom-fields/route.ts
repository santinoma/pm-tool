import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_TYPES = ["text", "number", "select", "multi_select", "date", "person", "url", "percent"];
const VALID_ENTITY_TYPES = ["task", "budget", "wiki_page", "user"];
const OPTIONS_REQUIRED_TYPES = ["select", "multi_select"];

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const fields = await context.tenantDb.customFieldDef.findMany({
    where: { library: true },
    include: {
      projectAttachments: { include: { project: { select: { id: true, name: true } } } },
    },
    orderBy: { label: "asc" },
  });
  return NextResponse.json({ fields });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.key !== "string" || typeof body.label !== "string" || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "key, label und ein gültiger type sind erforderlich." }, { status: 400 });
  }
  if (body.entityType !== undefined && !VALID_ENTITY_TYPES.includes(body.entityType)) {
    return NextResponse.json({ error: "entityType muss 'task', 'budget', 'wiki_page' oder 'user' sein." }, { status: 400 });
  }
  if (OPTIONS_REQUIRED_TYPES.includes(body.type) && (!Array.isArray(body.options) || body.options.length === 0)) {
    return NextResponse.json({ error: "select/multi_select-Felder benötigen mindestens eine Option." }, { status: 400 });
  }

  const field = await context.tenantDb.customFieldDef.create({
    data: {
      library: true,
      entityType: body.entityType ?? "task",
      key: body.key,
      label: body.label,
      type: body.type,
      options: Array.isArray(body.options) ? body.options : [],
      required: body.required === true,
      sensitive: body.sensitive === true,
      autoAttach: body.autoAttach === true,
    },
  });
  return NextResponse.json({ field }, { status: 201 });
}
