export interface UtilizationTaskLike {
  estimatedHours: number | null;
}

export interface UtilizationResult {
  plannedHours: number;
  utilizationPercent: number;
}

export function computeUtilization(
  tasks: UtilizationTaskLike[],
  weeklyCapacityHours: number,
): UtilizationResult {
  const plannedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours ?? 0), 0);
  const utilizationPercent = weeklyCapacityHours > 0 ? (plannedHours / weeklyCapacityHours) * 100 : 0;
  return { plannedHours, utilizationPercent };
}
