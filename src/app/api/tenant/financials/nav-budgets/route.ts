import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

const TAKE = 5;

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const [budgets, expenses, invoices, purchaseOrders, payments] = await Promise.all([
    context.tenantDb.budget.findMany({
      orderBy: { updatedAt: "desc" },
      take: TAKE,
      include: { project: { select: { id: true, name: true } } },
    }),
    context.tenantDb.expense.findMany({
      orderBy: { incurredAt: "desc" },
      take: TAKE,
      include: { project: { select: { id: true, name: true } } },
    }),
    context.tenantDb.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: TAKE,
      include: { budget: { include: { project: { select: { id: true, name: true } } } } },
    }),
    context.tenantDb.purchaseOrder.findMany({
      orderBy: { orderedAt: "desc" },
      take: TAKE,
      include: { project: { select: { id: true, name: true } } },
    }),
    context.tenantDb.invoicePayment.findMany({
      orderBy: { paidAt: "desc" },
      take: TAKE,
      include: { invoice: { include: { budget: { include: { project: { select: { id: true, name: true } } } } } } },
    }),
  ]);

  return NextResponse.json({
    budgets: budgets.map((budget) => ({
      href: `/financials/${budget.projectId}/${budget.id}`,
      label: `${budget.project.name} – ${budget.title}`,
    })),
    expenses: expenses.map((expense) => ({
      href: "/expenses",
      label: `${expense.project.name} – ${expense.description}`,
    })),
    invoices: invoices.map((invoice) => ({
      href: `/financials/${invoice.budget.projectId}/${invoice.budgetId}`,
      label: `${invoice.budget.project.name} – ${invoice.budget.title}`,
    })),
    purchaseOrders: purchaseOrders.map((po) => ({
      href: "/purchase-orders",
      label: `${po.project.name} – ${po.vendorName}`,
    })),
    payments: payments.map((payment) => ({
      href: `/financials/${payment.invoice.budget.projectId}/${payment.invoice.budgetId}`,
      label: `${payment.invoice.budget.project.name} – ${payment.amount.toFixed(2)}`,
    })),
  });
}
