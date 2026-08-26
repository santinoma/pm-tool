export interface ProgressTaskLike {
  statusCategory: "not_started" | "started" | "done";
}

export interface ProgressResult {
  done: number;
  total: number;
  percent: number;
}

export function computeProgress(tasks: ProgressTaskLike[]): ProgressResult {
  const total = tasks.length;
  if (total === 0) {
    return { done: 0, total: 0, percent: 0 };
  }
  const done = tasks.filter((task) => task.statusCategory === "done").length;
  return { done, total, percent: Math.round((done / total) * 100) };
}
