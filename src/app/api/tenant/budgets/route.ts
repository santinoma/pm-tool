import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }

  const budgets = await context.tenantDb.budget.findMany({
    where: { projectId },
    include: { owner: true, sections: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ budgets });
}

export async function POST(request: Request) {
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
    typeof body.projectId !== "string" ||
    typeof body.title !== "string" ||
    body.title.trim().length === 0 ||
    typeof body.ownerId !== "string"
  ) {
    return NextResponse.json(
      { error: "projectId, title und ownerId sind erforderlich." },
      { status: 400 },
    );
  }

  const isRetainer = body.isRetainer === true;
  if (isRetainer && body.recurrenceInterval !== "weekly" && body.recurrenceInterval !== "monthly") {
    return NextResponse.json(
      { error: "recurrenceInterval muss 'weekly' oder 'monthly' sein, wenn isRetainer gesetzt ist." },
      { status: 400 },
    );
  }

  const budget = await context.tenantDb.budget.create({
    data: {
      projectId: body.projectId,
      title: body.title,
      ownerId: body.ownerId,
      isRetainer,
      recurrenceInterval: isRetainer ? body.recurrenceInterval : null,
    },
    include: { owner: true, sections: true },
  });
  return NextResponse.json({ budget }, { status: 201 });
}
