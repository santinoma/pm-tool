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
