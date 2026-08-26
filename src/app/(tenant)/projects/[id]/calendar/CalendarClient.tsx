"use client";

import { useMemo, useState } from "react";
import { buildMonthGrid, getUtcDateKey } from "@/tenant/projects/dateUtils";

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
    <div className="container">
      <div className="row" style={{ gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
        <button type="button" onClick={goToPreviousMonth} className="btn btn-secondary btn-sm">
          ← Vorheriger Monat
        </button>
        <h1 style={{ margin: 0, minWidth: "220px", textAlign: "center" }}>
          {new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("de-DE", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </h1>
        <button type="button" onClick={goToNextMonth} className="btn btn-secondary btn-sm">
          Nächster Monat →
        </button>
      </div>

      <div className="calendar-grid">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-weekday">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = getUtcDateKey(day);
          const isCurrentMonth = day.getUTCMonth() === monthIndex;
          const dayTasks = tasksByDay.get(key) ?? [];
          return (
            <div key={key} className={`calendar-day${isCurrentMonth ? "" : " is-outside"}`}>
              <div className="calendar-day-number">{day.getUTCDate()}</div>
              {dayTasks.map((task) => (
                <div key={task.id} className="calendar-task">
                  {task.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
