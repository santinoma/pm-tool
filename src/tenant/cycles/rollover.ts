/**
 * Findet den zuletzt abgelaufenen Cycle eines Projekts (per `endDate`, vor dem
 * Start des neu angelegten Cycles), dessen unerledigte Tasks in den neuen
 * Cycle übernommen werden sollen. Nur der direkt vorangehende Cycle zählt —
 * Cycles die schon vor ihm lagen, wurden bereits bei ihrem eigenen Rollover
 * berücksichtigt (oder der Nutzer hat bewusst nicht rolliert).
 */
export function findRolloverSourceCycleId<T extends { id: string; endDate: Date }>(
  candidateCycles: T[],
  newCycleStartDate: Date,
): string | null {
  const ended = candidateCycles
    .filter((cycle) => cycle.endDate.getTime() <= newCycleStartDate.getTime())
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
  return ended[0]?.id ?? null;
}
