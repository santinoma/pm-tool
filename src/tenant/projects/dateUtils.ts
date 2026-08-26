/**
 * UTC-basierter Datums-Schlüssel (YYYY-MM-DD), damit Kalender-Zuordnung nicht von der
 * lokalen Zeitzone des Browsers abhängt (sonst Off-by-one-Risiko nahe Mitternacht).
 */
export function getUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Ganztägige Differenz in Tagen, auf UTC-Kalendertage normalisiert (keine Zeitanteile). */
export function differenceInDays(a: Date, b: Date): number {
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((aUtc - bUtc) / MS_PER_DAY);
}

export function addDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days),
  );
}

export interface GanttBarPosition {
  left: number;
  width: number;
}

/**
 * Berechnet die Pixel-Position/-Breite eines Gantt-Balkens relativ zum Zeitleisten-Start.
 * `dueDate` wird als inklusiver letzter Tag behandelt (Balken ist mind. 1 Tag breit).
 */
export function computeBarPosition(
  startDate: Date,
  dueDate: Date,
  rangeStart: Date,
  pxPerDay: number,
): GanttBarPosition {
  const left = differenceInDays(startDate, rangeStart) * pxPerDay;
  const durationDays = Math.max(1, differenceInDays(dueDate, startDate) + 1);
  return { left, width: durationDays * pxPerDay };
}

export function buildMonthGrid(year: number, monthIndex: number): Date[] {
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const startWeekday = (firstOfMonth.getUTCDay() + 6) % 7; // Montag = 0
  const gridStart = new Date(Date.UTC(year, monthIndex, 1 - startWeekday));

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(Date.UTC(year, monthIndex, 1 - startWeekday + i)));
  }
  return days;
}
