"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LegendKey } from "@/ui/components/LegendKey";

interface MyTask {
  id: string;
  title: string;
  status: string;
  statusCategory: string;
  projectId: string | null;
  projectName: string;
  dueDate: string | null;
}

type SortKey = "title" | "status" | "projectName" | "dueDate";

export function MyTasksClient({ tasks }: { tasks: MyTask[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const statuses = useMemo(() => Array.from(new Set(tasks.map((t) => t.status))), [tasks]);

  const visibleTasks = useMemo(() => {
    const filtered = statusFilter ? tasks.filter((t) => t.status === statusFilter) : tasks;
    return [...filtered].sort((a, b) => {
      const aValue = a[sortKey] ?? "";
      const bValue = b[sortKey] ?? "";
      return aValue.localeCompare(bValue);
    });
  }, [tasks, sortKey, statusFilter]);

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <div>
          <h1>Meine Tasks</h1>
          <p className="text-muted" style={{ marginTop: "var(--space-1)" }}>
            Alle dir zugewiesenen Tasks über alle Projekte.
          </p>
        </div>
        <div className="row" style={{ gap: "var(--space-3)" }}>
          <select
            className="select"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
          >
            <option value="title">Sortieren: Titel</option>
            <option value="status">Sortieren: Status</option>
            <option value="projectName">Sortieren: Projekt</option>
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
        </div>
      </div>

      {visibleTasks.length === 0 ? (
        <div className="empty-state">
          <h3>Keine Tasks</h3>
          <p>Dir sind aktuell keine Tasks zugewiesen.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Projekt</th>
                <th>Status</th>
                <th>Fälligkeit</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    {task.projectId ? (
                      <Link href={`/projects/${task.projectId}/tasks/${task.id}`}>{task.title}</Link>
                    ) : (
                      task.title
                    )}
                  </td>
                  <td className="text-muted">
                    {task.projectId ? (
                      <Link href={`/projects/${task.projectId}/list`}>{task.projectName}</Link>
                    ) : (
                      task.projectName
                    )}
                  </td>
                  <td>
                    <LegendKey label={task.status} category={task.statusCategory} />
                  </td>
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
