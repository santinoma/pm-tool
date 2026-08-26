export const HOUR_HEIGHT_PX = 48;
export const SNAP_MINUTES = 15;
export const MIN_DURATION_MINUTES = 15;

export function snapMinutes(minutes: number, step: number = SNAP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function minutesToTopPx(minutes: number, hourHeightPx: number = HOUR_HEIGHT_PX): number {
  return (minutes / 60) * hourHeightPx;
}

export function pxToMinutes(px: number, hourHeightPx: number = HOUR_HEIGHT_PX): number {
  return (px / hourHeightPx) * 60;
}

export function minutesToHeightPx(durationMinutes: number, hourHeightPx: number = HOUR_HEIGHT_PX): number {
  return (durationMinutes / 60) * hourHeightPx;
}

/**
 * Ordnet zwei (noch unsortierte, während des Ziehens vertauschbare) Minutenwerte zu
 * einem gültigen [start, end]-Bereich, rastet auf `step` und erzwingt eine
 * Mindestdauer, ohne über Mitternacht (0..1440) hinauszulaufen.
 */
export function resolveDragRange(
  minutesA: number,
  minutesB: number,
  step: number = SNAP_MINUTES,
  minDurationMinutes: number = MIN_DURATION_MINUTES,
): { startMinutes: number; endMinutes: number } {
  const snappedA = snapMinutes(minutesA, step);
  const snappedB = snapMinutes(minutesB, step);
  let start = Math.min(snappedA, snappedB);
  let end = Math.max(snappedA, snappedB);
  if (end - start < minDurationMinutes) {
    end = start + minDurationMinutes;
  }
  start = Math.max(0, Math.min(start, 1440 - minDurationMinutes));
  end = Math.max(start + minDurationMinutes, Math.min(end, 1440));
  return { startMinutes: start, endMinutes: end };
}

/**
 * Verschiebt einen bestehenden Zeitblock um `deltaMinutes` (Balken ziehen = beide
 * Ränder verschieben sich gleich), gerastet und innerhalb des Tages geclampt.
 */
export function moveBlock(
  startMinutes: number,
  endMinutes: number,
  deltaMinutes: number,
  step: number = SNAP_MINUTES,
): { startMinutes: number; endMinutes: number } {
  const duration = endMinutes - startMinutes;
  const snappedDelta = snapMinutes(deltaMinutes, step);
  let start = startMinutes + snappedDelta;
  start = Math.max(0, Math.min(start, 1440 - duration));
  return { startMinutes: start, endMinutes: start + duration };
}

/**
 * Zieht nur eine Kante (Resize) — 'start' oder 'end' — und erzwingt die Mindestdauer.
 */
export function resizeBlock(
  startMinutes: number,
  endMinutes: number,
  edge: "start" | "end",
  newEdgeMinutes: number,
  step: number = SNAP_MINUTES,
  minDurationMinutes: number = MIN_DURATION_MINUTES,
): { startMinutes: number; endMinutes: number } {
  const snapped = snapMinutes(newEdgeMinutes, step);
  if (edge === "start") {
    const start = Math.max(0, Math.min(snapped, endMinutes - minDurationMinutes));
    return { startMinutes: start, endMinutes };
  }
  const end = Math.min(1440, Math.max(snapped, startMinutes + minDurationMinutes));
  return { startMinutes, endMinutes: end };
}

export function formatMinutesAsTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 24 * 60));
  const hours = Math.floor(clamped / 60) % 24;
  const mins = Math.round(clamped % 60);
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
