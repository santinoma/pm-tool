"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

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
    <div className="pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{portfolio.name}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Fortschritt (erledigte Tasks über alle Projekte): <strong>{progress}%</strong>
      </p>

      <h2 className="mb-3 text-lg font-semibold">Projekte</h2>
      <ul className="mb-8 flex flex-col gap-1">
        {allProjects.map((project) => (
          <li key={project.id}>
            <label className="flex items-center gap-3 text-sm">
              <Checkbox checked={selectedProjectIds.includes(project.id)} disabled={!canManage} onCheckedChange={() => toggleProject(project.id)} />
              {project.name}
            </label>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 text-lg font-semibold">Ziele</h2>
      {portfolio.goals.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Noch keine Ziele.</p>
      ) : (
        <ul className="mb-8 flex flex-col gap-1">
          {portfolio.goals.map((goal) => (
            <li key={goal.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
              <span>
                {goal.name}
                {goal.dueDate && <span className="text-xs text-muted-foreground"> · fällig {goal.dueDate}</span>}
              </span>
              {canManage ? (
                <Select value={goal.status} onValueChange={(value) => updateGoalStatus(goal.id, value)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(GOAL_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span>{GOAL_STATUS_LABELS[goal.status] ?? goal.status}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <h3 className="mb-3 text-base font-semibold">Neues Ziel</h3>
          <form onSubmit={handleCreateGoal} className="flex flex-wrap gap-3">
            <Input placeholder="Name" value={goalName} onChange={(event) => setGoalName(event.target.value)} required className="w-56" />
            <Input type="date" value={goalDueDate} onChange={(event) => setGoalDueDate(event.target.value)} className="w-auto" />
            <Button type="submit" loading={saving}>
              Anlegen
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
