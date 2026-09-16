"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, computeBarPosition, getUtcDateKey } from "@/tenant/projects/dateUtils";

import { Button } from "@/ui/shadcn/components/button";
import { cn } from "@/ui/shadcn/lib/utils";

interface TimelineTask {
  id: string;
  title: string;
  statusCategory: string;
  assignee: string | null;
  startDate: string | null;
  dueDate: string | null;
}

const PX_PER_DAY = 36;
const VISIBLE_DAYS = 28;

const CATEGORY_BAR_CLASS: Record<string, string> = {
  not_started: "bg-muted-foreground/40",
  started: "bg-primary",
  done: "bg-success",
};

function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

// Reference "Timeline Layout": tasks ordered by start date (earliest at top), plotted
// on a date axis; tasks without a due date live in the "Unscheduled" list on the
// right rather than on the axis. Simplified vs. Gantt: no dependency arrows, no
// drag-resize — clicking a bar opens the task, matching "click on a task's box for
// more options".
export function TimelineClient({ projectId, tasks }: { projectId: string; tasks: TimelineTask[] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const rangeStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7 - 7), [weekOffset]);
  const days = useMemo(() => Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(rangeStart, i)), [rangeStart]);
  const rangeEnd = days[days.length - 1];
  const todayKey = getUtcDateKey(new Date());

  const { scheduled, unscheduled } = useMemo(() => {
    const scheduledTasks = tasks
      .filter((t) => t.dueDate)
      .map((t) => ({ ...t, effectiveStart: t.startDate ?? t.dueDate! }))
      .sort((a, b) => a.effectiveStart.localeCompare(b.effectiveStart))
      .filter((t) => new Date(t.dueDate!) >= rangeStart && new Date(t.effectiveStart) <= rangeEnd);
    const unscheduledTasks = tasks.filter((t) => !t.dueDate);
    return { scheduled: scheduledTasks, unscheduled: unscheduledTasks };
  }, [tasks, rangeStart, rangeEnd]);

  return (
    <div className="flex h-full gap-6 px-4 pb-10 md:px-6">
      <div className="min-w-0 flex-1">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                Heute
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {scheduled.length === 0 ? (
          <div className="rounded-lg border py-14 text-center">
            <h3 className="font-semibold">Keine geplanten Tasks in diesem Zeitraum</h3>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <div style={{ width: VISIBLE_DAYS * PX_PER_DAY }}>
              <div className="flex border-b bg-muted/40">
                {days.map((day) => {
                  const key = getUtcDateKey(day);
                  const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
                  return (
                    <div
                      key={key}
                      style={{ width: PX_PER_DAY }}
                      className={cn(
                        "shrink-0 border-r px-1 py-1.5 text-center font-mono text-[10px] text-muted-foreground",
                        isWeekend && "bg-muted/60",
                        key === todayKey && "bg-primary/10 text-primary",
                      )}
                    >
                      {day.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit" })}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col">
                {scheduled.map((task) => {
                  const start = new Date(task.effectiveStart);
                  const due = new Date(task.dueDate!);
                  const clampedStart = start < rangeStart ? rangeStart : start;
                  const clampedDue = due > rangeEnd ? rangeEnd : due;
                  const { left, width } = computeBarPosition(clampedStart, clampedDue, rangeStart, PX_PER_DAY);
                  return (
                    <div key={task.id} className="relative h-9 border-b last:border-0">
                      <Link
                        href={`/projects/${projectId}/tasks/${task.id}`}
                        title={task.title}
                        style={{ left, width: Math.max(width, PX_PER_DAY - 4) }}
                        className={cn(
                          "absolute top-1 flex h-7 items-center truncate rounded px-2 text-xs font-medium text-white shadow-xs hover:opacity-90",
                          CATEGORY_BAR_CLASS[task.statusCategory] ?? "bg-primary",
                        )}
                      >
                        {task.title}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-64 shrink-0 border-l pl-4">
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Unscheduled {unscheduled.length > 0 ? `(${unscheduled.length})` : ""}
        </h2>
        {unscheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {unscheduled.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/projects/${projectId}/tasks/${task.id}`}
                  className="block truncate rounded-md border px-2 py-1.5 text-sm hover:border-primary hover:text-primary"
                  title={task.title}
                >
                  {task.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
