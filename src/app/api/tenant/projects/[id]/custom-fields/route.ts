import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

const VALID_TYPES = ["text", "number", "select", "multi_select", "date", "person", "url", "percent"];
const VALID_ENTITY_TYPES = ["task", "budget", "wiki_page"];
const OPTIONS_REQUIRED_TYPES = ["select", "multi_select"];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const entityType = new URL(request.url).searchParams.get("entityType");
  const fields = await context.tenantDb.customFieldDef.findMany({
    where: {
      projectId: id,
      entityType:
        entityType && VALID_ENTITY_TYPES.includes(entityType)
          ? (entityType as "task" | "budget" | "wiki_page")
          : undefined,
    },
  });
  return NextResponse.json({ fields });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.key !== "string" ||
    typeof body.label !== "string" ||
    !VALID_TYPES.includes(body.type)
  ) {
    return NextResponse.json(
      { error: "key, label und ein gültiger type sind erforderlich." },
      { status: 400 },
    );
  }
  if (body.entityType !== undefined && !VALID_ENTITY_TYPES.includes(body.entityType)) {
    return NextResponse.json({ error: "entityType muss 'task', 'budget' oder 'wiki_page' sein." }, { status: 400 });
  }
  if (OPTIONS_REQUIRED_TYPES.includes(body.type) && (!Array.isArray(body.options) || body.options.length === 0)) {
    return NextResponse.json(
      { error: "select/multi_select-Felder benötigen mindestens eine Option." },
      { status: 400 },
    );
  }

  const field = await context.tenantDb.customFieldDef.create({
    data: {
      projectId: id,
      entityType: body.entityType ?? "task",
      key: body.key,
      label: body.label,
      type: body.type,
      options: Array.isArray(body.options) ? body.options : [],
    },
  });
  return NextResponse.json({ field }, { status: 201 });
}
