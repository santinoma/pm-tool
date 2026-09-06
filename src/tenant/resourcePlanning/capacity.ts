/**
 * Reines Kapazitäts-Modul für den Buchungs-Grid des Resource Planners.
 *
 * Konvention für die Tages-Baseline: `computeUtilization` (siehe utilization.ts) rechnet
 * ausschließlich auf Wochenbasis (geplante Stunden / Wochenkapazität) und trifft keine
 * Aussage über die Verteilung auf einzelne Tage. Für die Tagesansicht des Buchungs-Grids
 * nehmen wir daher — wie in der Aufgabenstellung vorgegeben — eine 5-Tage-Woche an:
 * Tageskapazität = weeklyCapacityHours / 5. Das ist eine Erweiterung, kein Widerspruch zur
 * bestehenden Konvention.
 *
 * Tentative (unverbindliche) Buchungen zählen NICHT in die Über-Kapazitäts-Markierung
 * (`isOver`) ein, werden aber weiterhin in `bookedHours` mitgezählt, damit die Zelle die
 * tatsächlich gebuchten Stunden anzeigt. Die UI kann tentative Buchungen zusätzlich separat
 * darstellen (gestrichelter Rahmen), das Signal "rot/grün" bezieht sich aber ausschließlich
 * auf bestätigte (nicht-tentative) Buchungen.
 */

export interface BookingLike {
  userId: string | null;
  startDate: Date;
  endDate: Date;
  hoursPerDay: number;
  isTentative: boolean;
}

export interface BookingValidationInput {
  userId?: string | null;
  placeholderName?: string | null;
  startDate: string | Date;
  endDate: string | Date;
}

export interface BookingValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Prüft die Kernregeln einer Buchung, unabhängig von HTTP/DB:
 * - genau eines von userId/placeholderName muss gesetzt sein
 * - endDate darf nicht vor startDate liegen
 */
export function validateBookingInput(input: BookingValidationInput): BookingValidationResult {
  const hasUser = typeof input.userId === "string" && input.userId.trim().length > 0;
  const hasPlaceholder = typeof input.placeholderName === "string" && input.placeholderName.trim().length > 0;

  if (hasUser === hasPlaceholder) {
    return {
      valid: false,
      error: "Genau eines von userId oder placeholderName muss angegeben werden.",
    };
  }

  const start = input.startDate instanceof Date ? input.startDate : new Date(input.startDate);
  const end = input.endDate instanceof Date ? input.endDate : new Date(input.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { valid: false, error: "Ungültiger Zeitraum." };
  }
  if (end.getTime() < start.getTime()) {
    return { valid: false, error: "endDate darf nicht vor startDate liegen." };
  }

  return { valid: true };
}

function coversDay(booking: BookingLike, day: Date): boolean {
  const dayStart = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
  return booking.startDate.getTime() <= dayEnd && booking.endDate.getTime() >= dayStart;
}

export interface DailyCapacityEntry {
  date: Date;
  bookedHours: number;
  /** Nur bestätigte (nicht-tentative) gebuchte Stunden — Basis für `isOver`. */
  confirmedHours: number;
  tentativeHours: number;
  capacityHours: number;
  isOver: boolean;
}

/**
 * Berechnet pro Tag (`days`) die gebuchten Stunden eines Users aus allen überlappenden
 * Buchungen sowie die Tageskapazität (weeklyCapacityHours / 5). `isOver` wird ausschließlich
 * anhand bestätigter (nicht-tentativer) Buchungen ermittelt.
 */
export function computeDailyCapacity(
  bookings: BookingLike[],
  userId: string,
  weeklyCapacityHours: number,
  days: Date[],
): DailyCapacityEntry[] {
  const userBookings = bookings.filter((booking) => booking.userId === userId);
  const dailyCapacityHours = weeklyCapacityHours / 5;

  return days.map((day) => {
    let confirmedHours = 0;
    let tentativeHours = 0;
    for (const booking of userBookings) {
      if (!coversDay(booking, day)) continue;
      if (booking.isTentative) {
        tentativeHours += booking.hoursPerDay;
      } else {
        confirmedHours += booking.hoursPerDay;
      }
    }
    return {
      date: day,
      bookedHours: confirmedHours + tentativeHours,
      confirmedHours,
      tentativeHours,
      capacityHours: dailyCapacityHours,
      isOver: confirmedHours > dailyCapacityHours,
    };
  });
}
