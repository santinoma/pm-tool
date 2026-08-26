interface TaskForProgress {
  statusCategory: "not_started" | "started" | "done";
}

export function computePortfolioProgress(tasks: TaskForProgress[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((task) => task.statusCategory === "done").length;
  return Math.round((done / tasks.length) * 100);
}
