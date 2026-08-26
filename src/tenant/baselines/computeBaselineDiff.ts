export interface BaselineSnapshotEntry {
  taskId: string;
  taskTitle: string;
  dueDate: Date | null;
  estimatedHours: number | null;
  statusCategory: "not_started" | "started" | "done";
}

export interface CurrentTaskEntry {
  taskId: string;
  dueDate: Date | null;
  estimatedHours: number | null;
  statusCategory: "not_started" | "started" | "done";
}

export interface BaselineDiffEntry {
  taskId: string;
  taskTitle: string;
  removed: boolean;
  dueDateShiftDays: number | null;
  estimatedHoursDelta: number | null;
  statusChanged: boolean;
  baselineStatusCategory: string;
  currentStatusCategory: string | null;
}

export function computeBaselineDiff(
  snapshot: BaselineSnapshotEntry[],
  current: CurrentTaskEntry[],
): BaselineDiffEntry[] {
  const currentById = new Map(current.map((task) => [task.taskId, task]));

  return snapshot.map((snapshotTask) => {
    const currentTask = currentById.get(snapshotTask.taskId);

    if (!currentTask) {
      return {
        taskId: snapshotTask.taskId,
        taskTitle: snapshotTask.taskTitle,
        removed: true,
        dueDateShiftDays: null,
        estimatedHoursDelta: null,
        statusChanged: false,
        baselineStatusCategory: snapshotTask.statusCategory,
        currentStatusCategory: null,
      };
    }

    const dueDateShiftDays =
      snapshotTask.dueDate && currentTask.dueDate
        ? Math.round((currentTask.dueDate.getTime() - snapshotTask.dueDate.getTime()) / (24 * 60 * 60 * 1000))
        : null;
    const estimatedHoursDelta =
      snapshotTask.estimatedHours !== null && currentTask.estimatedHours !== null
        ? currentTask.estimatedHours - snapshotTask.estimatedHours
        : null;

    return {
      taskId: snapshotTask.taskId,
      taskTitle: snapshotTask.taskTitle,
      removed: false,
      dueDateShiftDays,
      estimatedHoursDelta,
      statusChanged: currentTask.statusCategory !== snapshotTask.statusCategory,
      baselineStatusCategory: snapshotTask.statusCategory,
      currentStatusCategory: currentTask.statusCategory,
    };
  });
}
