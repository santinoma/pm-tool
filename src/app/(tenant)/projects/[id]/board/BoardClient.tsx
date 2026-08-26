"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface BoardStatus {
  id: string;
  name: string;
}

interface BoardTask {
  id: string;
  title: string;
  statusId: string;
  assignee: string | null;
}

export function BoardClient({
  projectId,
  statuses,
  tasks,
}: {
  projectId: string;
  statuses: BoardStatus[];
  tasks: BoardTask[];
}) {
  const router = useRouter();
  const [localTasks, setLocalTasks] = useState(tasks);
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function moveTask(taskId: string, statusId: string) {
    setLocalTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, statusId } : task)),
    );

    const response = await fetch(`/api/tenant/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId }),
    });
    if (!response.ok) {
      router.refresh();
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/tenant/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, projectId }),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Task konnte nicht angelegt werden.");
      return;
    }
    setNewTitle("");
    setCreating(false);
    router.refresh();
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "flex-end", gap: "var(--space-2)", padding: "var(--space-4) var(--space-6) 0" }}>
        {creating ? (
          <form onSubmit={handleCreate} className="row" style={{ gap: "var(--space-2)" }}>
            <input
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Titel des neuen Tasks…"
              required
              autoFocus
              className="input"
            />
            <button type="submit" className="btn btn-primary">
              Anlegen
            </button>
            <button type="button" onClick={() => setCreating(false)} className="btn btn-ghost">
              Abbrechen
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setCreating(true)} className="btn btn-primary">
            Neuer Task
          </button>
        )}
      </div>
      {error && <p className="field-error" style={{ padding: "0 var(--space-6)" }}>{error}</p>}

      <div className="board">
        {statuses.map((status) => (
          <div
            key={status.id}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOverStatusId(status.id);
            }}
            onDragLeave={() => setDragOverStatusId(null)}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = event.dataTransfer.getData("text/task-id");
              setDragOverStatusId(null);
              if (taskId) {
                void moveTask(taskId, status.id);
              }
            }}
            className={`board-col${dragOverStatusId === status.id ? " is-drag-over" : ""}`}
          >
            <div className="board-col-header">
              <span>{status.name}</span>
              <span className="coord">{localTasks.filter((t) => t.statusId === status.id).length}</span>
            </div>
            {localTasks
              .filter((task) => task.statusId === status.id)
              .map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/task-id", task.id);
                  }}
                  className="board-card"
                >
                  <Link href={`/projects/${projectId}/tasks/${task.id}`}>{task.title}</Link>
                  {task.assignee && <div className="board-card-assignee">{task.assignee}</div>}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
