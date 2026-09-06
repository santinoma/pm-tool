import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const expenses = await context.tenantDb.expense.findMany({
    where: isPrivileged ? undefined : { project: { members: { some: { userId: context.currentUser.id } } } },
    orderBy: { incurredAt: "desc" },
    include: {
      project: { select: { id: true, name: true, client: { select: { name: true } } } },
      budget: { select: { id: true, title: true } },
      serviceType: { select: { id: true, name: true } },
      createdBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    },
  });
  return NextResponse.json({ expenses });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.projectId !== "string" || body.projectId.trim().length === 0) {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }
  if (typeof body.description !== "string" || body.description.trim().length === 0) {
    return NextResponse.json({ error: "description ist erforderlich." }, { status: 400 });
  }
  if (typeof body.amount !== "number" || !Number.isFinite(body.amount)) {
    return NextResponse.json({ error: "amount muss eine Zahl sein." }, { status: 400 });
  }
  const incurredAt = typeof body.incurredAt === "string" && !Number.isNaN(Date.parse(body.incurredAt)) ? new Date(body.incurredAt) : new Date();

  const expense = await context.tenantDb.expense.create({
    data: {
      projectId: body.projectId,
      budgetId: typeof body.budgetId === "string" ? body.budgetId : null,
      serviceTypeId: typeof body.serviceTypeId === "string" ? body.serviceTypeId : null,
      description: body.description,
      amount: body.amount,
      billable: typeof body.billable === "boolean" ? body.billable : true,
      incurredAt,
      createdById: context.currentUser.id,
    },
    include: { project: { select: { id: true, name: true, client: { select: { name: true } } } }, serviceType: true },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
