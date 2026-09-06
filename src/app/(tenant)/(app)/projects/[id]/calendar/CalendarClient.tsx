"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildMonthGrid, getUtcDateKey } from "@/tenant/projects/dateUtils";

import { Button } from "@/ui/shadcn/components/button";
import { cn } from "@/ui/shadcn/lib/utils";

interface CalendarTask {
  id: string;
  title: string;
  dueDate: string;
}

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function CalendarClient({ tasks }: { tasks: CalendarTask[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getUTCMonth());

  const days = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of tasks) {
      const key = getUtcDateKey(new Date(task.dueDate));
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  function goToPreviousMonth() {
    if (monthIndex === 0) {
      setYear((y) => y - 1);
      setMonthIndex(11);
    } else {
      setMonthIndex((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (monthIndex === 11) {
      setYear((y) => y + 1);
      setMonthIndex(0);
    } else {
      setMonthIndex((m) => m + 1);
    }
  }

  return (
    <div className="pb-10">
      <div className="mb-5 flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
          <ChevronLeft className="size-4" />
          Vorheriger Monat
        </Button>
        <h1 className="min-w-56 text-center text-xl font-bold tracking-tight">
          {new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("de-DE", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </h1>
        <Button variant="outline" size="sm" onClick={goToNextMonth}>
          Nächster Monat
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-muted/60 px-2 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = getUtcDateKey(day);
          const isCurrentMonth = day.getUTCMonth() === monthIndex;
          const dayTasks = tasksByDay.get(key) ?? [];
          return (
            <div key={key} className={cn("min-h-24 bg-background p-2", !isCurrentMonth && "bg-muted/30 opacity-60")}>
              <div className="font-mono text-xs text-muted-foreground">{day.getUTCDate()}</div>
              <div className="mt-1 flex flex-col gap-1">
                {dayTasks.map((task) => (
                  <div key={task.id} className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
