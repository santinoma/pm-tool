import type { BillableRateStrategy } from "@/generated/tenant-client/client.js";

/**
 * Productive "Billable Rate"-Strategie (T313): bestimmt, welcher Basissatz
 * für Zeiterfassung in einem Budget herangezogen wird, bevor Rabatt/Aufschlag
 * angewandt werden:
 * - "service" (Standard, bisheriges Verhalten): `BudgetSection.price`.
 * - "person": individueller `BudgetSectionAssignee.hourlyRate` der buchenden
 *   Person — fällt auf `sectionPrice` zurück, falls für die Person kein
 *   eigener Satz gepflegt ist (sonst würde Zeiterfassung für nicht
 *   konfigurierte Personen kommentarlos auf 0 fallen).
 * - "single": ein Satz für das gesamte Budget (`Budget.billableRate`).
 * - "no_rate": kein Satz — Zeit bleibt erfassbar, wird aber nicht automatisch
 *   bewertet (0).
 */
export function resolveBaseRate(
  strategy: BillableRateStrategy,
  sectionPrice: number,
  assigneeHourlyRate: number | null,
  budgetBillableRate: number | null,
): number {
  switch (strategy) {
    case "no_rate":
      return 0;
    case "single":
      return budgetBillableRate ?? 0;
    case "person":
      return assigneeHourlyRate ?? sectionPrice;
    case "service":
    default:
      return sectionPrice;
  }
}

/**
 * Effektiver Preis einer Service-Zeile nach Rabatt/Aufschlag. Rabatt wird
 * zuerst angewandt, danach der Aufschlag auf den bereits reduzierten Betrag —
 * entspricht der üblichen Reihenfolge (Rabatt vom Listenpreis, Aufschlag auf
 * den Netto-Preis).
 */
export function computeEffectiveUnitPrice(
  basePrice: number,
  discountPercent: number | null,
  markupPercent: number | null,
): number {
  let price = basePrice;
  if (discountPercent) {
    price = price * (1 - discountPercent / 100);
  }
  if (markupPercent) {
    price = price * (1 + markupPercent / 100);
  }
  return price;
}

export function computeServiceTotal(
  quantity: number,
  basePrice: number,
  discountPercent: number | null,
  markupPercent: number | null,
): number {
  return quantity * computeEffectiveUnitPrice(basePrice, discountPercent, markupPercent);
}

/**
 * Prüft, ob eine zusätzliche Buchung (Zeiteintrag/Ausgabe) das Limit
 * überschreiten würde und laut `blockOverrun`/`guaranteedMaxPrice` blockiert
 * werden muss. `cap` ist bewusst optional: ohne `guaranteedMaxPrice` gibt es
 * kein Limit, `blockOverrun` allein hat ohne Cap keine Wirkung.
 */
export function isOverrunBlocked(
  currentUsed: number,
  additionalAmount: number,
  cap: number | null,
  blockOverrun: boolean,
): boolean {
  if (!blockOverrun || cap === null) {
    return false;
  }
  return currentUsed + additionalAmount > cap;
}
