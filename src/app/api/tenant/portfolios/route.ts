import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const portfolios = await context.tenantDb.portfolio.findMany({
    orderBy: { createdAt: "desc" },
    include: { projects: true, goals: true },
  });
  return NextResponse.json({ portfolios });
}

export async function POST(request: Request) {
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

  const portfolio = await context.tenantDb.portfolio.create({
    data: {
      name: body.name,
      description: typeof body.description === "string" ? body.description : undefined,
    },
  });
  return NextResponse.json({ portfolio }, { status: 201 });
}
