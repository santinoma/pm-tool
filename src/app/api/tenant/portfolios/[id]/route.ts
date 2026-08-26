import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { computePortfolioProgress } from "@/tenant/portfolios/portfolioProgress";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const portfolio = await context.tenantDb.portfolio.findUnique({
    where: { id },
    include: { projects: true, goals: true },
  });
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio nicht gefunden." }, { status: 404 });
  }

  const projectIds = portfolio.projects.map((project) => project.id);
  const tasks =
    projectIds.length > 0
      ? await context.tenantDb.task.findMany({
          where: { projects: { some: { projectId: { in: projectIds } } } },
          include: { status: true },
        })
      : [];
  const progress = computePortfolioProgress(tasks.map((task) => ({ statusCategory: task.status.category })));

  return NextResponse.json({ portfolio, progress });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (!body) {
    return NextResponse.json({ error: "Ungültiger Body." }, { status: 400 });
  }

  if (Array.isArray(body.projectIds)) {
    await context.tenantDb.project.updateMany({
      where: { portfolioId: id },
      data: { portfolioId: null },
    });
    if (body.projectIds.length > 0) {
      await context.tenantDb.project.updateMany({
        where: { id: { in: body.projectIds } },
        data: { portfolioId: id },
      });
    }
  }

  const portfolio = await context.tenantDb.portfolio.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
    },
    include: { projects: true, goals: true },
  });

  return NextResponse.json({ portfolio });
}
