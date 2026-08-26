import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { aggregateByProject } from "@/tenant/timeTracking/duration";
import { computeBudgetStatus } from "@/tenant/budgeting/aggregate";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const [project, entries, taskLinks, settings] = await Promise.all([
    context.tenantDb.project.findUnique({ where: { id } }),
    context.tenantDb.timeEntry.findMany({
      where: { durationMinutes: { not: null } },
      select: { taskId: true, projectId: true, durationMinutes: true },
    }),
    context.tenantDb.taskProject.findMany({
      where: { isPrimary: true },
      select: { taskId: true, projectId: true, isPrimary: true },
    }),
    getOrCreateTenantSettings(context.tenantDb),
  ]);

  if (!project) {
    return NextResponse.json({ error: "Projekt nicht gefunden." }, { status: 404 });
  }

  const actualMinutesByProject = aggregateByProject(entries, taskLinks);
  const actualMinutes = actualMinutesByProject[id] ?? 0;
  const { actualHours, actualAmount } = computeBudgetStatus(actualMinutes, project.hourlyRate);

  return NextResponse.json({
    budget: {
      budgetHours: project.budgetHours,
      budgetAmount: project.budgetAmount,
      hourlyRate: project.hourlyRate,
      actualHours,
      actualAmount,
      currency: settings.currency,
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const toNullableNumber = (value: unknown): number | null | undefined => {
    if (value === null) return null;
    if (typeof value === "number") return value;
    return undefined;
  };

  const budgetHours = toNullableNumber(body.budgetHours);
  const budgetAmount = toNullableNumber(body.budgetAmount);
  const hourlyRate = toNullableNumber(body.hourlyRate);

  const project = await context.tenantDb.project.update({
    where: { id },
    data: { budgetHours, budgetAmount, hourlyRate },
  });

  return NextResponse.json({
    budget: {
      budgetHours: project.budgetHours,
      budgetAmount: project.budgetAmount,
      hourlyRate: project.hourlyRate,
    },
  });
}
