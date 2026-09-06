import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { validateCustomFieldValue, type CustomFieldTypeName } from "@/tenant/projects/customFieldValue";
import { resolveProjectIdForBudget } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> },
) {
  const { id, fieldId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const denied = await assertSingleProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdForBudget(context.tenantDb, id),
  );
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.value !== "string") {
    return NextResponse.json({ error: "value ist erforderlich." }, { status: 400 });
  }

  const field = await context.tenantDb.customFieldDef.findUnique({ where: { id: fieldId } });
  if (!field) {
    return NextResponse.json({ error: "Feld nicht gefunden." }, { status: 404 });
  }

  const validation = validateCustomFieldValue(field.type as CustomFieldTypeName, body.value, field.options);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }
  if (field.type === "person") {
    const user = await context.tenantDb.user.findUnique({ where: { id: body.value } });
    if (!user) {
      return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 400 });
    }
  }

  const value = await context.tenantDb.budgetCustomFieldValue.upsert({
    where: { fieldId_budgetId: { fieldId, budgetId: id } },
    create: { fieldId, budgetId: id, value: body.value },
    update: { value: body.value },
  });

  return NextResponse.json({ value });
}
