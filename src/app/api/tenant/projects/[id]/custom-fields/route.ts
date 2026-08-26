import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

const VALID_TYPES = ["text", "number", "select", "date"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const fields = await context.tenantDb.customFieldDef.findMany({ where: { projectId: id } });
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
  if (body.type === "select" && (!Array.isArray(body.options) || body.options.length === 0)) {
    return NextResponse.json(
      { error: "select-Felder benötigen mindestens eine Option." },
      { status: 400 },
    );
  }

  const field = await context.tenantDb.customFieldDef.create({
    data: {
      projectId: id,
      key: body.key,
      label: body.label,
      type: body.type,
      options: Array.isArray(body.options) ? body.options : [],
    },
  });
  return NextResponse.json({ field }, { status: 201 });
}
