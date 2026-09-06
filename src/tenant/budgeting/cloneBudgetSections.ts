export type BudgetSectionBillingType = "time_and_materials" | "fixed" | "percentage" | "non_billable";
export type BudgetSectionTrackingUnit = "hours" | "days" | "piece";

export interface SourceBudgetSection {
  name: string;
  description: string | null;
  quantity: number;
  price: number;
  serviceTypeId: string | null;
  billingType: BudgetSectionBillingType;
  trackingUnit: BudgetSectionTrackingUnit;
  discountPercent: number | null;
  markupPercent: number | null;
  guaranteedMaxPrice: number | null;
  blockOverrun: boolean;
  trackTime: boolean;
  trackExpenses: boolean;
  trackBooking: boolean;
  warningThresholdPercent: number | null;
  position: number;
}

export interface ClonedBudgetSection {
  name: string;
  description: string | null;
  quantity: number;
  price: number;
  budgetUsed: number;
  serviceTypeId: string | null;
  billingType: BudgetSectionBillingType;
  trackingUnit: BudgetSectionTrackingUnit;
  discountPercent: number | null;
  markupPercent: number | null;
  guaranteedMaxPrice: number | null;
  blockOverrun: boolean;
  trackTime: boolean;
  trackExpenses: boolean;
  trackBooking: boolean;
  warningThresholdPercent: number | null;
  position: number;
}

/**
 * Shared field list for "copy sections from one budget onto another" — used both by
 * budget templates (POST /api/tenant/budgets mit templateBudgetId) und vom
 * Retainer-Wiederholungsmotor (buildRecurringBudgetClone), damit die Feldliste
 * nur an einer Stelle gepflegt werden muss. Reine Transformation, keine DB-Zugriffe;
 * `budgetUsed` wird bewusst immer frisch auf 0 gesetzt.
 */
export function cloneBudgetSections(sourceSections: SourceBudgetSection[]): ClonedBudgetSection[] {
  return sourceSections
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((section) => ({
      name: section.name,
      description: section.description,
      quantity: section.quantity,
      price: section.price,
      budgetUsed: 0,
      serviceTypeId: section.serviceTypeId,
      billingType: section.billingType,
      trackingUnit: section.trackingUnit,
      discountPercent: section.discountPercent,
      markupPercent: section.markupPercent,
      guaranteedMaxPrice: section.guaranteedMaxPrice,
      blockOverrun: section.blockOverrun,
      trackTime: section.trackTime,
      trackExpenses: section.trackExpenses,
      trackBooking: section.trackBooking,
      warningThresholdPercent: section.warningThresholdPercent,
      position: section.position,
    }));
}
