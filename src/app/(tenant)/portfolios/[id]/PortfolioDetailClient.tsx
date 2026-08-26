"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Goal {
  id: string;
  name: string;
  status: string;
  dueDate: string | null;
}

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  projectIds: string[];
  goals: Goal[];
}

const GOAL_STATUS_LABELS: Record<string, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  off_track: "Off Track",
  done: "Erledigt",
};

export function PortfolioDetailClient({
  portfolio,
  progress,
  allProjects,
  canManage,
}: {
  portfolio: Portfolio;
  progress: number;
  allProjects: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(portfolio.projectIds);
  const [goalName, setGoalName] = useState("");
  const [goalDueDate, setGoalDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveProjectAssignment(nextIds: string[]) {
    setSelectedProjectIds(nextIds);
    await fetch(`/api/tenant/portfolios/${portfolio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectIds: nextIds }),
    });
    router.refresh();
  }

  function toggleProject(projectId: string) {
    const nextIds = selectedProjectIds.includes(projectId)
      ? selectedProjectIds.filter((id) => id !== projectId)
      : [...selectedProjectIds, projectId];
    saveProjectAssignment(nextIds);
  }

  async function handleCreateGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch(`/api/tenant/portfolios/${portfolio.id}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: goalName, dueDate: goalDueDate || undefined }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Ziel konnte nicht angelegt werden.");
      return;
    }
    setGoalName("");
    setGoalDueDate("");
    router.refresh();
  }

  async function updateGoalStatus(goalId: string, status: string) {
    await fetch(`/api/tenant/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-2)" }}>{portfolio.name}</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
        Fortschritt (erledigte Tasks über alle Projekte): <strong>{progress}%</strong>
      </p>

      <h2 style={{ marginBottom: "var(--space-3)" }}>Projekte</h2>
      <ul className="list-plain" style={{ marginBottom: "var(--space-8)" }}>
        {allProjects.map((project) => (
          <li key={project.id}>
            <label className="row" style={{ gap: "var(--space-3)" }}>
              <input
                type="checkbox"
                checked={selectedProjectIds.includes(project.id)}
                disabled={!canManage}
                onChange={() => toggleProject(project.id)}
              />
              {project.name}
            </label>
          </li>
        ))}
      </ul>

      <h2 style={{ marginBottom: "var(--space-3)" }}>Ziele</h2>
      {portfolio.goals.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
          Noch keine Ziele.
        </p>
      ) : (
        <ul className="list-plain" style={{ marginBottom: "var(--space-8)" }}>
          {portfolio.goals.map((goal) => (
            <li key={goal.id} className="row" style={{ justifyContent: "space-between" }}>
              <span>
                {goal.name}
                {goal.dueDate && <span className="coord text-muted"> · fällig {goal.dueDate}</span>}
              </span>
              {canManage ? (
                <select
                  className="select"
                  value={goal.status}
                  onChange={(event) => updateGoalStatus(goal.id, event.target.value)}
                >
                  {Object.entries(GOAL_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <span>{GOAL_STATUS_LABELS[goal.status] ?? goal.status}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <h3 style={{ marginBottom: "var(--space-3)" }}>Neues Ziel</h3>
          <form onSubmit={handleCreateGoal} className="row" style={{ gap: "var(--space-3)", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Name"
              value={goalName}
              onChange={(event) => setGoalName(event.target.value)}
              required
              className="input"
            />
            <input
              type="date"
              value={goalDueDate}
              onChange={(event) => setGoalDueDate(event.target.value)}
              className="input"
            />
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Anlegen
            </button>
          </form>
          {error && <p className="field-error" style={{ marginTop: "var(--space-3)" }}>{error}</p>}
        </>
      )}
    </div>
  );
}
