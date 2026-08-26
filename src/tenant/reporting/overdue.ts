export interface OverdueTaskLike {
  id: string;
  dueDate: Date | null;
  statusCategory: "not_started" | "started" | "done";
}

export function computeOverdueTasks<T extends OverdueTaskLike>(tasks: T[], now: Date): T[] {
  return tasks.filter(
    (task) => task.dueDate !== null && task.dueDate.getTime() < now.getTime() && task.statusCategory !== "done",
  );
}
