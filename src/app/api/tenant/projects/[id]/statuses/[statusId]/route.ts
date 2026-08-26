import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

const VALID_CATEGORIES = ["not_started", "started", "done"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; statusId: string }> },
) {
  const { statusId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (body.category !== undefined && !VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Ungültige Kategorie." }, { status: 400 });
  }

  const status = await context.tenantDb.workflowStatus.update({
    where: { id: statusId },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      category: body.category,
      position: typeof body.position === "number" ? body.position : undefined,
    },
  });
  return NextResponse.json({ status });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; statusId: string }> },
) {
  const { statusId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const taskCount = await context.tenantDb.task.count({ where: { statusId } });
  if (taskCount > 0) {
    return NextResponse.json(
      { error: `Status kann nicht gelöscht werden: ${taskCount} Task(s) referenzieren ihn noch.` },
      { status: 409 },
    );
  }

  await context.tenantDb.workflowStatus.delete({ where: { id: statusId } });
  return NextResponse.json({ ok: true });
}
