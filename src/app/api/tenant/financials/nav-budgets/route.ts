import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

const NAV_BUDGET_LIMIT = 8;

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const budgets = await context.tenantDb.budget.findMany({
    orderBy: { createdAt: "desc" },
    take: NAV_BUDGET_LIMIT,
    include: { project: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    budgets: budgets.map((budget) => ({
      budgetId: budget.id,
      budgetTitle: budget.title,
      projectId: budget.projectId,
      projectName: budget.project.name,
    })),
  });
}
