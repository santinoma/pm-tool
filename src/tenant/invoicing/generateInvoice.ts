export interface BillableTimeEntry {
  id: string;
  budgetSectionId: string;
  durationMinutes: number;
  amount: number;
}

export interface BillableExpense {
  id: string;
  description: string;
  amount: number;
}

export interface InvoiceLineItemDraft {
  /** Null for expense-based line items — Expense has no per-section FK. */
  budgetSectionId: string | null;
  expenseId?: string;
  description: string;
  quantityHours: number;
  rate: number;
  amount: number;
}

export interface BuildInvoiceResult {
  lineItems: InvoiceLineItemDraft[];
  totalAmount: number;
  timeEntryIds: string[];
  expenseIds: string[];
}

export function buildInvoiceLineItems(
  entries: BillableTimeEntry[],
  sectionNames: Record<string, string>,
): BuildInvoiceResult {
  const bySection = new Map<string, { minutes: number; amount: number }>();
  for (const entry of entries) {
    const current = bySection.get(entry.budgetSectionId) ?? { minutes: 0, amount: 0 };
    current.minutes += entry.durationMinutes;
    current.amount += entry.amount;
    bySection.set(entry.budgetSectionId, current);
  }

  const lineItems: InvoiceLineItemDraft[] = [];
  let totalAmount = 0;
  for (const [budgetSectionId, { minutes, amount }] of bySection.entries()) {
    const quantityHours = minutes / 60;
    const rate = quantityHours > 0 ? amount / quantityHours : 0;
    lineItems.push({
      budgetSectionId,
      description: sectionNames[budgetSectionId] ?? "Leistung",
      quantityHours,
      rate,
      amount,
    });
    totalAmount += amount;
  }

  return { lineItems, totalAmount, timeEntryIds: entries.map((entry) => entry.id), expenseIds: [] };
}

/**
 * Ein Posten je Spesenbuchung (nicht aggregiert wie bei Zeiterfassung, da
 * jede Buchung ihre eigene Beschreibung/ihr eigenes Datum trägt). `rate` und
 * `quantityHours` sind hier nicht aussagekräftig (Spesen sind nicht
 * zeitbasiert) — `quantityHours: 1`, `rate === amount` als Konvention.
 */
export function buildExpenseLineItems(expenses: BillableExpense[]): BuildInvoiceResult {
  const lineItems: InvoiceLineItemDraft[] = expenses.map((expense) => ({
    budgetSectionId: null,
    expenseId: expense.id,
    description: expense.description,
    quantityHours: 1,
    rate: expense.amount,
    amount: expense.amount,
  }));
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return { lineItems, totalAmount, timeEntryIds: [], expenseIds: expenses.map((expense) => expense.id) };
}

export interface SectionForInvoicing {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

/**
 * `remaining_amount`-Methode: pro Sektion ein Posten über
 * (quantity * price) abzüglich bereits fakturierter Beträge dieser Sektion
 * (über alle bisherigen Rechnungen des Budgets hinweg).
 */
export function buildRemainingAmountLineItems(
  sections: SectionForInvoicing[],
  invoicedAmountBySection: Record<string, number>,
): BuildInvoiceResult {
  const lineItems: InvoiceLineItemDraft[] = [];
  let totalAmount = 0;
  for (const section of sections) {
    const fullAmount = section.quantity * section.price;
    const alreadyInvoiced = invoicedAmountBySection[section.id] ?? 0;
    const remaining = fullAmount - alreadyInvoiced;
    if (remaining <= 0) continue;
    lineItems.push({
      budgetSectionId: section.id,
      description: section.name,
      quantityHours: 1,
      rate: remaining,
      amount: remaining,
    });
    totalAmount += remaining;
  }
  return { lineItems, totalAmount, timeEntryIds: [], expenseIds: [] };
}

/**
 * `percentage`-Methode: pro Sektion ein Posten über
 * (quantity * price) * percentage / 100 — unabhängig davon, was bereits
 * fakturiert wurde (z.B. für Meilenstein-Abrechnung "50% jetzt").
 */
export function buildPercentageLineItems(
  sections: SectionForInvoicing[],
  percentage: number,
): BuildInvoiceResult {
  const lineItems: InvoiceLineItemDraft[] = [];
  let totalAmount = 0;
  for (const section of sections) {
    const fullAmount = section.quantity * section.price;
    const amount = (fullAmount * percentage) / 100;
    if (amount <= 0) continue;
    lineItems.push({
      budgetSectionId: section.id,
      description: section.name,
      quantityHours: 1,
      rate: amount,
      amount,
    });
    totalAmount += amount;
  }
  return { lineItems, totalAmount, timeEntryIds: [], expenseIds: [] };
}
