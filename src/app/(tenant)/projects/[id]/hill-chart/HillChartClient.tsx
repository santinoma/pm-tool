"use client";

import { useEffect, useRef, useState } from "react";
import { hillPositionToCoords } from "@/tenant/hillChart/geometry";

interface HillTask {
  id: string;
  title: string;
  hillPosition: number;
}

const WIDTH = 600;
const HEIGHT = 200;
const HILL_PATH = `M 0 ${HEIGHT} Q ${WIDTH / 2} ${-HEIGHT} ${WIDTH} ${HEIGHT}`;

interface DragState {
  taskId: string;
  startX: number;
  originalPosition: number;
  positionDelta: number;
}

export function HillChartClient({ tasks: initialTasks }: { tasks: HillTask[] }) {
  const [tasks, setTasks] = useState<HillTask[]>(initialTasks);
  const [drag, setDrag] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drag) return;

    function handleMouseMove(event: MouseEvent) {
      setDrag((current) => {
        if (!current) return current;
        const deltaPx = event.clientX - current.startX;
        const positionDelta = (deltaPx / WIDTH) * 100;
        return { ...current, positionDelta };
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
    const newPosition = Math.max(0, Math.min(100, finalDrag.originalPosition + finalDrag.positionDelta));

    setTasks((current) =>
      current.map((task) => (task.id === finalDrag.taskId ? { ...task, hillPosition: newPosition } : task)),
    );

    void fetch(`/api/tenant/tasks/${finalDrag.taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hillPosition: newPosition }),
    });
  }

  function startDrag(taskId: string, event: React.MouseEvent) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setDrag({ taskId, startX: event.clientX, originalPosition: task.hillPosition, positionDelta: 0 });
  }

  function displayedPosition(task: HillTask): number {
    if (drag && drag.taskId === task.id) {
      return Math.max(0, Math.min(100, drag.originalPosition + drag.positionDelta));
    }
    return task.hillPosition;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-1)" }}>Hill Chart</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
        Links: noch am Rausfinden. Gipfel: vollständig verstanden. Rechts: wird umgesetzt.
      </p>
      {tasks.length === 0 ? (
        <div className="empty-state">
          <h3>Keine Tasks auf dem Hill Chart</h3>
          <p>Setze eine Hill-Position auf einem Task, damit er hier erscheint.</p>
        </div>
      ) : (
        <div ref={containerRef} style={{ position: "relative", width: `${WIDTH}px`, height: `${HEIGHT + 40}px` }}>
          <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", top: 0, left: 0 }}>
            <path d={HILL_PATH} fill="none" stroke="var(--border-strong)" strokeWidth={2} />
          </svg>
          {tasks.map((task) => {
            const position = displayedPosition(task);
            const { x, y } = hillPositionToCoords(position, WIDTH, HEIGHT);
            return (
              <div
                key={task.id}
                onMouseDown={(event) => startDrag(task.id, event)}
                title={task.title}
                style={{
                  position: "absolute",
                  left: `${x - 8}px`,
                  top: `${HEIGHT - y - 8}px`,
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  border: "2px solid var(--surface)",
                  boxShadow: "var(--shadow-sm)",
                  cursor: "grab",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                  }}
                >
                  {task.title}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
