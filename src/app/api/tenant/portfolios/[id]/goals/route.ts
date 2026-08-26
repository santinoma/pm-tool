import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

const VALID_STATUSES = ["on_track", "at_risk", "off_track", "done"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManagePortfolios = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "portfolios_manage",
  );
  if (!canManagePortfolios) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Ungültiger status." }, { status: 400 });
  }

  const goal = await context.tenantDb.goal.create({
    data: {
      portfolioId: id,
      name: body.name,
      dueDate: typeof body.dueDate === "string" ? new Date(body.dueDate) : undefined,
      status: body.status ?? undefined,
    },
  });
  return NextResponse.json({ goal }, { status: 201 });
}
