"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LegendKey } from "@/ui/components/LegendKey";

interface ListTask {
  id: string;
  title: string;
  status: string;
  statusCategory: string;
  assignee: string | null;
  dueDate: string | null;
}

type SortKey = "title" | "status" | "assignee" | "dueDate";

export function ListClient({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: ListTask[];
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const statuses = useMemo(() => Array.from(new Set(tasks.map((t) => t.status))), [tasks]);

  const visibleTasks = useMemo(() => {
    const filtered = statusFilter ? tasks.filter((t) => t.status === statusFilter) : tasks;
    return [...filtered].sort((a, b) => {
      const aValue = a[sortKey] ?? "";
      const bValue = b[sortKey] ?? "";
      return aValue.localeCompare(bValue);
    });
  }, [tasks, sortKey, statusFilter]);

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
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h1>Liste</h1>
        <div className="row" style={{ gap: "var(--space-3)" }}>
          <select
            className="select"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
          >
            <option value="title">Sortieren: Titel</option>
            <option value="status">Sortieren: Status</option>
            <option value="assignee">Sortieren: Assignee</option>
            <option value="dueDate">Sortieren: Fälligkeit</option>
          </select>
          <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Alle Status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setCreating((current) => !current)} className="btn btn-primary">
            Neuer Task
          </button>
        </div>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="row" style={{ gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
          <input
            type="text"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Titel des neuen Tasks…"
            required
            autoFocus
            className="input"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary">
            Anlegen
          </button>
          <button type="button" onClick={() => setCreating(false)} className="btn btn-ghost">
            Abbrechen
          </button>
        </form>
      )}
      {error && <p className="field-error" style={{ marginBottom: "var(--space-4)" }}>{error}</p>}

      {visibleTasks.length === 0 ? (
        <div className="empty-state">
          <h3>Keine Tasks</h3>
          <p>Lege einen Task an oder passe den Filter an.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Fälligkeit</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <Link href={`/projects/${projectId}/tasks/${task.id}`}>{task.title}</Link>
                  </td>
                  <td>
                    <LegendKey label={task.status} category={task.statusCategory} />
                  </td>
                  <td className="text-muted">{task.assignee ?? "—"}</td>
                  <td className="coord">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("de-DE") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
