"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LegendKey } from "@/ui/components/LegendKey";

interface CycleTaskRow {
  id: string;
  title: string;
  statusName: string;
  statusCategory: "not_started" | "started" | "done";
  estimatedHours: number | null;
  assigneeLabel: string | null;
  isScopeCreep: boolean;
}

interface Insights {
  totalTasks: number;
  doneTasks: number;
  velocity: number;
  plannedScopeHours: number;
  scopeCreepHours: number;
  scopeCreepPercent: number;
}

export function CycleDetailClient({
  projectId,
  cycle,
  insights,
  tasks,
  availableTasks,
}: {
  projectId: string;
  cycle: { id: string; name: string; startDate: string; endDate: string };
  insights: Insights;
  tasks: CycleTaskRow[];
  availableTasks: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState(availableTasks[0]?.id ?? "");

  async function assignTask(taskId: string) {
    await fetch(`/api/tenant/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycleId: cycle.id }),
    });
    router.refresh();
  }

  async function removeTask(taskId: string) {
    await fetch(`/api/tenant/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycleId: null }),
    });
    router.refresh();
  }

  return (
    <div className="container">
      <Link href={`/projects/${projectId}/cycles`} className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
        ← Alle Cycles
      </Link>
      <h1 style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-1)" }}>{cycle.name}</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
        {cycle.startDate} – {cycle.endDate}
      </p>

      <div className="widget-grid" style={{ marginBottom: "var(--space-8)" }}>
        <div className="widget-card">
          <div className="widget-title">Velocity</div>
          <div className="coord" style={{ fontSize: "var(--text-lg)" }}>
            {insights.velocity}h
          </div>
          <p className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
            {insights.doneTasks}/{insights.totalTasks} Tasks erledigt
          </p>
        </div>
        <div className="widget-card">
          <div className="widget-title">Scope Creep</div>
          <div className="coord" style={{ fontSize: "var(--text-lg)" }}>
            {insights.scopeCreepPercent.toFixed(1)}%
          </div>
          <p className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
            {insights.scopeCreepHours}h nachträglich / {insights.plannedScopeHours}h geplant
          </p>
        </div>
      </div>

      <h2 style={{ marginBottom: "var(--space-3)" }}>Tasks im Cycle</h2>
      {tasks.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
          Noch keine Tasks zugeordnet.
        </p>
      ) : (
        <div className="table-wrap" style={{ marginBottom: "var(--space-8)" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Zuständig</th>
                <th className="coord">Std.</th>
                <th>Scope</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>
                    <LegendKey label={task.statusName} category={task.statusCategory} />
                  </td>
                  <td className="text-muted">{task.assigneeLabel ?? "—"}</td>
                  <td className="coord">{task.estimatedHours ?? "—"}</td>
                  <td>{task.isScopeCreep ? <LegendKey label="Scope Creep" variant="warning" /> : "Geplant"}</td>
                  <td>
                    <button type="button" onClick={() => removeTask(task.id)} className="btn btn-ghost btn-sm">
                      Entfernen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginBottom: "var(--space-3)" }}>Task hinzufügen</h2>
      {availableTasks.length === 0 ? (
        <p className="text-muted">Keine weiteren Tasks im Projekt verfügbar.</p>
      ) : (
        <div className="row" style={{ gap: "var(--space-3)" }}>
          <select className="select" value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}>
            {availableTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => assignTask(selectedTaskId)} className="btn btn-primary">
            Zum Cycle hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}
