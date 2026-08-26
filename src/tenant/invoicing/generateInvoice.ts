export interface BillableTimeEntry {
  id: string;
  budgetSectionId: string;
  durationMinutes: number;
  amount: number;
}

export interface InvoiceLineItemDraft {
  budgetSectionId: string;
  description: string;
  quantityHours: number;
  rate: number;
  amount: number;
}

export interface BuildInvoiceResult {
  lineItems: InvoiceLineItemDraft[];
  totalAmount: number;
  timeEntryIds: string[];
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

  return { lineItems, totalAmount, timeEntryIds: entries.map((entry) => entry.id) };
}
