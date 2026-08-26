import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const sections = await context.tenantDb.budgetSection.findMany({
    where: { budgetId: id },
    include: { assignees: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ sections });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManageBudgets = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "budgets_manage",
  );
  if (!canManageBudgets) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    body.name.trim().length === 0 ||
    typeof body.quantity !== "number" ||
    typeof body.price !== "number"
  ) {
    return NextResponse.json(
      { error: "name, quantity und price sind erforderlich." },
      { status: 400 },
    );
  }
  const assigneeIds: string[] = Array.isArray(body.assigneeIds) ? body.assigneeIds : [];

  const section = await context.tenantDb.budgetSection.create({
    data: {
      budgetId: id,
      name: body.name,
      budgetedTimeHours: typeof body.budgetedTimeHours === "number" ? body.budgetedTimeHours : null,
      quantity: body.quantity,
      price: body.price,
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
    },
    include: { assignees: { include: { user: true } } },
  });
  return NextResponse.json({ section }, { status: 201 });
}
