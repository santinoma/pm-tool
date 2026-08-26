export interface CycleTaskInput {
  statusCategory: "not_started" | "started" | "done";
  estimatedHours: number | null;
  cycleAssignedAt: Date | null;
}

export interface CycleInsights {
  totalTasks: number;
  doneTasks: number;
  velocity: number;
  plannedScopeHours: number;
  scopeCreepHours: number;
  scopeCreepPercent: number;
}

export function computeCycleInsights(tasks: CycleTaskInput[], cycleStartDate: Date): CycleInsights {
  let doneTasks = 0;
  let velocity = 0;
  let plannedScopeHours = 0;
  let scopeCreepHours = 0;

  for (const task of tasks) {
    const hours = task.estimatedHours ?? 0;
    if (task.statusCategory === "done") {
      doneTasks += 1;
      velocity += hours;
    }
    const isScopeCreep = task.cycleAssignedAt !== null && task.cycleAssignedAt.getTime() > cycleStartDate.getTime();
    if (isScopeCreep) {
      scopeCreepHours += hours;
    } else {
      plannedScopeHours += hours;
    }
  }

  const totalHours = plannedScopeHours + scopeCreepHours;
  const scopeCreepPercent = totalHours > 0 ? (scopeCreepHours / totalHours) * 100 : 0;

  return {
    totalTasks: tasks.length,
    doneTasks,
    velocity,
    plannedScopeHours,
    scopeCreepHours,
    scopeCreepPercent,
  };
}
