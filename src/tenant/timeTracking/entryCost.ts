export function computeEntryCost(durationMinutes: number, hourlyRate: number): number {
  return (durationMinutes / 60) * hourlyRate;
}
