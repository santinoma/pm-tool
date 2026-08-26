import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const rules = await context.tenantDb.transitionRule.findMany({
    where: { projectId: id },
    include: { fromStatus: true, toStatus: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rules });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManageWorkflows = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "workflows_manage",
    id,
  );
  if (!canManageWorkflows) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.toStatusId !== "string") {
    return NextResponse.json({ error: "toStatusId ist erforderlich." }, { status: 400 });
  }
  const requiredFieldKeys = Array.isArray(body.requiredFieldKeys)
    ? body.requiredFieldKeys.filter((key: unknown) => typeof key === "string")
    : [];
  if (requiredFieldKeys.length === 0) {
    return NextResponse.json({ error: "Mindestens ein Pflichtfeld ist erforderlich." }, { status: 400 });
  }

  const rule = await context.tenantDb.transitionRule.create({
    data: {
      projectId: id,
      fromStatusId: typeof body.fromStatusId === "string" ? body.fromStatusId : null,
      toStatusId: body.toStatusId,
      requiredFieldKeys,
    },
    include: { fromStatus: true, toStatus: true },
  });
  return NextResponse.json({ rule }, { status: 201 });
}
