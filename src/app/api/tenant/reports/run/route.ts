import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { computeSectionTotals } from "@/tenant/budgetingV2/sectionMath";
import {
  REPORT_DATA_SOURCES,
  runBudgetsReport,
  runTasksReport,
  runTimeEntriesReport,
  runDealsReport,
  runInvoicesReport,
  runExpensesReport,
  runPeopleReport,
  type ReportDataSource,
  type ReportFilterConfig,
  type ReportGroupByConfig,
  type TaskRow,
  type TimeEntryRow,
  type BudgetRow,
  type DealRow,
  type InvoiceRow,
  type ExpenseRow,
  type PersonRow,
} from "@/tenant/reporting/reportQuery";

function parseFilters(value: unknown): ReportFilterConfig[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const validOperators = new Set(["eq", "neq", "contains", "gt", "lt"]);
  for (const entry of value) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof (entry as Record<string, unknown>).field !== "string" ||
      !validOperators.has((entry as Record<string, unknown>).operator as string)
    ) {
      return null;
    }
  }
  return value as ReportFilterConfig[];
}

function parseGroupBy(value: unknown): ReportGroupByConfig | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || typeof (value as Record<string, unknown>).field !== "string") {
    return null;
  }
  return value as ReportGroupByConfig;
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { dataSource, filters: rawFilters, groupBy: rawGroupBy, projectId } = body as {
    dataSource?: string;
    filters?: unknown;
    groupBy?: unknown;
    projectId?: string | null;
  };

  if (!dataSource || !REPORT_DATA_SOURCES.includes(dataSource as ReportDataSource)) {
    return NextResponse.json(
      { error: `dataSource muss eines von ${REPORT_DATA_SOURCES.join(", ")} sein.` },
      { status: 400 },
    );
  }
  const filters = parseFilters(rawFilters);
  if (filters === null) {
    return NextResponse.json({ error: "Ungültige filters." }, { status: 400 });
  }
  const groupBy = parseGroupBy(rawGroupBy);
  if (groupBy === null) {
    return NextResponse.json({ error: "Ungültiges groupBy." }, { status: 400 });
  }

  const scopedProjectId = typeof projectId === "string" && projectId.trim() ? projectId : null;

  if (scopedProjectId) {
    const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, scopedProjectId);
    if (denied) return denied;
  } else if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json(
      { error: "Nur Owner/Admin können organisationsweite Berichte ausführen." },
      { status: 403 },
    );
  }

  if (dataSource === "tasks") {
    const tasks = await context.tenantDb.task.findMany({
      where: {
        inTriage: false,
        ...(scopedProjectId ? { projects: { some: { projectId: scopedProjectId, isPrimary: true } } } : {}),
      },
      include: {
        status: true,
        assignee: true,
        projects: { where: { isPrimary: true }, include: { project: true } },
      },
    });
    const rows: TaskRow[] = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status.name,
      statusCategory: task.status.category,
      assignee: task.assignee?.name ?? task.assignee?.email ?? null,
      project: task.projects[0]?.project.name ?? null,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      estimatedHours: task.estimatedHours,
    }));
    const result = runTasksReport(rows, filters, groupBy);
    return NextResponse.json(result);
  }

  if (dataSource === "time_entries") {
    const entries = await context.tenantDb.timeEntry.findMany({
      where: scopedProjectId ? { projectId: scopedProjectId } : {},
      include: { user: true, project: true, task: true },
    });
    const rows: TimeEntryRow[] = entries.map((entry) => ({
      id: entry.id,
      user: entry.user.name ?? entry.user.email,
      project: entry.project?.name ?? null,
      task: entry.task?.title ?? null,
      durationMinutes: entry.durationMinutes,
      date: (entry.startedAt ?? entry.createdAt).toISOString(),
    }));
    const result = runTimeEntriesReport(rows, filters, groupBy);
    return NextResponse.json(result);
  }

  if (dataSource === "budgets") {
    const budgets = await context.tenantDb.budget.findMany({
      where: {
        isScenario: false,
        ...(scopedProjectId ? { projectId: scopedProjectId } : {}),
      },
      include: { project: true, sections: true },
    });
    const rows: BudgetRow[] = budgets.map((budget) => {
      const totals = budget.sections.reduce(
        (sum, section) => {
          const sectionTotals = computeSectionTotals({
            quantity: section.quantity,
            price: section.price,
            budgetUsed: section.budgetUsed,
            discountPercent: section.discountPercent,
            markupPercent: section.markupPercent,
          });
          return {
            budgetTotal: sum.budgetTotal + sectionTotals.budgetTotal,
            budgetUsed: sum.budgetUsed + section.budgetUsed,
          };
        },
        { budgetTotal: 0, budgetUsed: 0 },
      );
      const budgetRemaining = totals.budgetTotal - totals.budgetUsed;
      const usagePercent = totals.budgetTotal > 0 ? (totals.budgetUsed / totals.budgetTotal) * 100 : 0;
      return {
        id: budget.id,
        title: budget.title,
        project: budget.project.name,
        budgetTotal: totals.budgetTotal,
        budgetUsed: totals.budgetUsed,
        budgetRemaining,
        usagePercent,
      };
    });
    const result = runBudgetsReport(rows, filters, groupBy);
    return NextResponse.json(result);
  }

  if (dataSource === "deals") {
    const deals = await context.tenantDb.deal.findMany({
      where: scopedProjectId ? { projectId: scopedProjectId } : {},
      include: { company: true, status: true, owner: true, lostReason: true },
    });
    const rows: DealRow[] = deals.map((deal) => ({
      id: deal.id,
      title: deal.title,
      company: deal.company.name,
      status: deal.status.name,
      statusCategory: deal.status.category,
      owner: deal.owner.name ?? deal.owner.email,
      estimatedValue: deal.estimatedValue,
      probability: deal.probability,
      lostReason: deal.lostReason?.label ?? null,
    }));
    const result = runDealsReport(rows, filters, groupBy);
    return NextResponse.json(result);
  }

  if (dataSource === "invoices") {
    const invoices = await context.tenantDb.invoice.findMany({
      where: scopedProjectId ? { budget: { projectId: scopedProjectId } } : {},
      include: { budget: { include: { project: true } } },
    });
    const rows: InvoiceRow[] = invoices.map((invoice) => ({
      id: invoice.id,
      project: invoice.budget.project.name,
      budget: invoice.budget.title,
      status: invoice.status,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      createdAt: invoice.createdAt.toISOString(),
    }));
    const result = runInvoicesReport(rows, filters, groupBy);
    return NextResponse.json(result);
  }

  if (dataSource === "expenses") {
    const expenses = await context.tenantDb.expense.findMany({
      where: scopedProjectId ? { projectId: scopedProjectId } : {},
      include: { project: true },
    });
    const rows: ExpenseRow[] = expenses.map((expense) => ({
      id: expense.id,
      description: expense.description,
      project: expense.project.name,
      amount: expense.amount,
      billable: expense.billable,
      approvalStatus: expense.approvalStatus,
      incurredAt: expense.incurredAt.toISOString(),
    }));
    const result = runExpensesReport(rows, filters, groupBy);
    return NextResponse.json(result);
  }

  // dataSource === "people"
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const users = await context.tenantDb.user.findMany({
    where: {
      isActive: true,
      ...(scopedProjectId ? { projectMemberships: { some: { projectId: scopedProjectId } } } : {}),
    },
  });
  const userIds = users.map((user) => user.id);
  const [totalMinutesByUser, recentMinutesByUser] = await Promise.all([
    userIds.length > 0
      ? context.tenantDb.timeEntry.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, durationMinutes: { not: null } },
          _sum: { durationMinutes: true },
        })
      : [],
    userIds.length > 0
      ? context.tenantDb.timeEntry.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, durationMinutes: { not: null }, createdAt: { gte: thirtyDaysAgo } },
          _sum: { durationMinutes: true },
        })
      : [],
  ]);
  const totalMinutesByUserId = new Map(totalMinutesByUser.map((r) => [r.userId, r._sum.durationMinutes ?? 0]));
  const recentMinutesByUserId = new Map(recentMinutesByUser.map((r) => [r.userId, r._sum.durationMinutes ?? 0]));
  const rows: PersonRow[] = users.map((user) => {
    const loggedHoursLast30Days = (recentMinutesByUserId.get(user.id) ?? 0) / 60;
    const expectedHoursOver30Days = user.weeklyCapacityHours * (30 / 7);
    const utilizationPercent = expectedHoursOver30Days > 0 ? (loggedHoursLast30Days / expectedHoursOver30Days) * 100 : 0;
    return {
      id: user.id,
      name: user.name ?? user.email,
      role: user.role,
      weeklyCapacityHours: user.weeklyCapacityHours,
      loggedHoursTotal: (totalMinutesByUserId.get(user.id) ?? 0) / 60,
      loggedHoursLast30Days,
      utilizationPercent,
    };
  });
  const result = runPeopleReport(rows, filters, groupBy);
  return NextResponse.json(result);
}
