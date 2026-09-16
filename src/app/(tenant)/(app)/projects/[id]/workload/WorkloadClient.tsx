"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, getUtcDateKey } from "@/tenant/projects/dateUtils";
import { getCurrentWeekRange, isWithinWeek } from "@/tenant/resourcePlanning/week";
import { computeEffectiveWeeklyCapacity } from "@/tenant/resourcePlanning/holidays";
import { computeUtilization } from "@/tenant/resourcePlanning/utilization";

import { Button } from "@/ui/shadcn/components/button";
import { Progress } from "@/ui/shadcn/components/progress";

interface Person {
  id: string;
  label: string;
  weeklyCapacityHours: number;
  holidays: string[];
}

interface WorkloadTask {
  id: string;
  title: string;
  estimatedHours: number | null;
  dueDate: string;
  assigneeId: string;
}

const WEEK_COUNT = 4;

// Reference "Workload View (Beta)": planned hours vs. capacity per person per week,
// reusing the same utilization/holiday-aware-capacity math as Resourcing > Resource
// Planner so the two views never disagree on what "100%" means.
export function WorkloadClient({ people, tasks }: { projectId: string; people: Person[]; tasks: WorkloadTask[] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weeks = useMemo(() => {
    const base = addDays(new Date(), weekOffset * 7 * WEEK_COUNT);
    return Array.from({ length: WEEK_COUNT }, (_, index) => getCurrentWeekRange(addDays(base, index * 7)));
  }, [weekOffset]);

  const tasksByAssignee = useMemo(() => {
    const map = new Map<string, WorkloadTask[]>();
    for (const task of tasks) {
      (map.get(task.assigneeId) ?? map.set(task.assigneeId, []).get(task.assigneeId)!).push(task);
    }
    return map;
  }, [tasks]);

  return (
    <div className="px-4 pb-10 md:px-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Workload</h1>
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

      {people.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Keine Projektmitglieder</h3>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Person
                </th>
                {weeks.map((week) => (
                  <th
                    key={getUtcDateKey(week.start)}
                    className="min-w-40 px-3 py-2 text-left font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                  >
                    {week.start.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} –{" "}
                    {week.end.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((person) => {
                const personTasks = tasksByAssignee.get(person.id) ?? [];
                return (
                  <tr key={person.id} className="border-b last:border-0">
                    <td className="px-3 py-3 font-medium">{person.label}</td>
                    {weeks.map((week) => {
                      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(week.start, i));
                      const effectiveCapacity = computeEffectiveWeeklyCapacity(
                        person.weeklyCapacityHours,
                        weekDays,
                        person.holidays.map((h) => ({ date: new Date(h) })),
                      );
                      const weekTasks = personTasks.filter((t) => isWithinWeek(new Date(t.dueDate), week));
                      const { plannedHours, utilizationPercent } = computeUtilization(weekTasks, effectiveCapacity);
                      return (
                        <td key={getUtcDateKey(week.start)} className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {plannedHours.toFixed(0)}h / {effectiveCapacity.toFixed(0)}h
                              </span>
                              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {utilizationPercent.toFixed(0)}%
                              </span>
                            </div>
                            <Progress
                              value={Math.min(100, utilizationPercent)}
                              variant={utilizationPercent > 100 ? "destructive" : "success"}
                              className="h-1.5"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
