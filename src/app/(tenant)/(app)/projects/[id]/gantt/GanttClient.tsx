"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, computeBarPosition, differenceInDays } from "@/tenant/projects/dateUtils";

interface GanttTaskInput {
  id: string;
  title: string;
  startDate: string;
  dueDate: string;
  blockedTaskIds: string[];
}

interface GanttTask {
  id: string;
  title: string;
  startDate: Date;
  dueDate: Date;
  blockedTaskIds: string[];
}

const PX_PER_DAY = 24;
const ROW_HEIGHT = 40;
const RANGE_PADDING_DAYS = 2;

type DragMode = "move" | "resize-left" | "resize-right";

interface DragState {
  taskId: string;
  mode: DragMode;
  startX: number;
  originalStart: Date;
  originalDue: Date;
  dayDelta: number;
}

export function GanttClient({ tasks: initialTasks }: { tasks: GanttTaskInput[] }) {
  const [tasks, setTasks] = useState<GanttTask[]>(() =>
    initialTasks.map((task) => ({
      ...task,
      startDate: new Date(task.startDate),
      dueDate: new Date(task.dueDate),
    })),
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const rangeStart = useMemo(() => {
    if (tasks.length === 0) return new Date();
    const earliest = tasks.reduce((min, t) => (t.startDate < min ? t.startDate : min), tasks[0].startDate);
    return addDays(earliest, -RANGE_PADDING_DAYS);
  }, [tasks]);

  const rangeEnd = useMemo(() => {
    if (tasks.length === 0) return addDays(new Date(), 14);
    const latest = tasks.reduce((max, t) => (t.dueDate > max ? t.dueDate : max), tasks[0].dueDate);
    return addDays(latest, RANGE_PADDING_DAYS);
  }, [tasks]);

  const totalDays = Math.max(1, differenceInDays(rangeEnd, rangeStart));

  useEffect(() => {
    if (!drag) return;

    function handleMouseMove(event: MouseEvent) {
      setDrag((current) => {
        if (!current) return current;
        const deltaPx = event.clientX - current.startX;
        const dayDelta = Math.round(deltaPx / PX_PER_DAY);
        return { ...current, dayDelta };
      });
    }

    function handleMouseUp() {
      setDrag((current) => {
        if (!current) return null;
        applyDrag(current);
        return null;
      });
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.taskId]);

  function applyDrag(finalDrag: DragState) {
    if (finalDrag.dayDelta === 0) return;

    setTasks((current) =>
      current.map((task) => {
        if (task.id !== finalDrag.taskId) return task;
        if (finalDrag.mode === "move") {
          return {
            ...task,
            startDate: addDays(finalDrag.originalStart, finalDrag.dayDelta),
            dueDate: addDays(finalDrag.originalDue, finalDrag.dayDelta),
          };
        }
        if (finalDrag.mode === "resize-left") {
          const newStart = addDays(finalDrag.originalStart, finalDrag.dayDelta);
          return { ...task, startDate: newStart < task.dueDate ? newStart : task.dueDate };
        }
        const newDue = addDays(finalDrag.originalDue, finalDrag.dayDelta);
        return { ...task, dueDate: newDue > task.startDate ? newDue : task.startDate };
      }),
    );

    const task = tasks.find((t) => t.id === finalDrag.taskId);
    if (!task) return;
    let startDate = task.startDate;
    let dueDate = task.dueDate;
    if (finalDrag.mode === "move") {
      startDate = addDays(finalDrag.originalStart, finalDrag.dayDelta);
      dueDate = addDays(finalDrag.originalDue, finalDrag.dayDelta);
    } else if (finalDrag.mode === "resize-left") {
      startDate = addDays(finalDrag.originalStart, finalDrag.dayDelta);
    } else {
      dueDate = addDays(finalDrag.originalDue, finalDrag.dayDelta);
    }

    void fetch(`/api/tenant/tasks/${finalDrag.taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: startDate.toISOString(), dueDate: dueDate.toISOString() }),
    });
  }

  function startDrag(taskId: string, mode: DragMode, event: React.MouseEvent) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setDrag({
      taskId,
      mode,
      startX: event.clientX,
      originalStart: task.startDate,
      originalDue: task.dueDate,
      dayDelta: 0,
    });
  }

  function displayedBar(task: GanttTask) {
    let { startDate, dueDate } = task;
    if (drag && drag.taskId === task.id) {
      if (drag.mode === "move") {
        startDate = addDays(drag.originalStart, drag.dayDelta);
        dueDate = addDays(drag.originalDue, drag.dayDelta);
      } else if (drag.mode === "resize-left") {
        startDate = addDays(drag.originalStart, drag.dayDelta);
      } else {
        dueDate = addDays(drag.originalDue, drag.dayDelta);
      }
    }
    return computeBarPosition(startDate, dueDate, rangeStart, PX_PER_DAY);
  }

  const taskIndexById = new Map(tasks.map((task, index) => [task.id, index]));

  return (
    <div className="pb-10">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Gantt</h1>
      {tasks.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Keine Tasks mit Fälligkeitsdatum</h3>
        </div>
      ) : (
        <div className="flex items-start">
          <div className="w-48 shrink-0">
            <div className="h-6" />
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center truncate pr-3 text-sm" style={{ height: `${ROW_HEIGHT}px` }}>
                {task.title}
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-x-auto">
            <div ref={containerRef} className="relative" style={{ width: `${totalDays * PX_PER_DAY}px`, height: `${24 + tasks.length * ROW_HEIGHT}px` }}>
              <svg
                width={totalDays * PX_PER_DAY}
                height={24 + tasks.length * ROW_HEIGHT}
                className="pointer-events-none absolute top-0 left-0"
              >
                {tasks.flatMap((task) =>
                  task.blockedTaskIds.map((blockedId) => {
                    const blockedIndex = taskIndexById.get(blockedId);
                    const fromIndex = taskIndexById.get(task.id);
                    if (blockedIndex === undefined || fromIndex === undefined) return null;
                    const fromBar = displayedBar(task);
                    const blockedTask = tasks[blockedIndex];
                    const toBar = displayedBar(blockedTask);
                    const y1 = 24 + fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const y2 = 24 + blockedIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const x1 = fromBar.left + fromBar.width;
                    const x2 = toBar.left;
                    return (
                      <line
                        key={`${task.id}-${blockedId}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="var(--primary)"
                        strokeWidth={1.5}
                        markerEnd="url(#arrow)"
                      />
                    );
                  }),
                )}
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill="var(--primary)" />
                  </marker>
                </defs>
              </svg>

              {tasks.map((task, index) => {
                const bar = displayedBar(task);
                return (
                  <div
                    key={task.id}
                    className="absolute flex items-stretch rounded-md bg-primary"
                    style={{
                      top: `${24 + index * ROW_HEIGHT + 4}px`,
                      left: `${bar.left}px`,
                      width: `${bar.width}px`,
                      height: `${ROW_HEIGHT - 8}px`,
                    }}
                  >
                    <div onMouseDown={(event) => startDrag(task.id, "resize-left", event)} className="w-1.5 cursor-col-resize" />
                    <div onMouseDown={(event) => startDrag(task.id, "move", event)} className="flex-1 cursor-grab" />
                    <div onMouseDown={(event) => startDrag(task.id, "resize-right", event)} className="w-1.5 cursor-col-resize" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
