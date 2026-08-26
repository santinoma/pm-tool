"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface BudgetRow {
  id: string;
  title: string;
  ownerLabel: string;
  sectionCount: number;
  budgetTotal: number;
}

export function ProjectBudgetsClient({
  projectId,
  projectName,
  canManage,
  budgets,
  users,
}: {
  projectId: string;
  projectName: string;
  canManage: boolean;
  budgets: BudgetRow[];
  users: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState(users[0]?.id ?? "");
  const [isRetainer, setIsRetainer] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<"weekly" | "monthly">("monthly");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/tenant/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        title,
        ownerId,
        isRetainer,
        recurrenceInterval: isRetainer ? recurrenceInterval : undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Budget konnte nicht angelegt werden.");
      return;
    }
    router.push(`/financials/${projectId}/${data.budget.id}`);
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <div className="text-faint coord" style={{ fontSize: "var(--text-xs)" }}>
            {projectName}
          </div>
          <h1 style={{ marginTop: "var(--space-1)" }}>Budgets</h1>
        </div>
        {canManage && (
          <button type="button" onClick={() => setCreating((c) => !c)} className="btn btn-primary">
            Neues Budget
          </button>
        )}
      </div>

      {creating && (
        <form
          onSubmit={handleCreate}
          className="card"
          style={{ marginBottom: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: "420px" }}
        >
          <div className="field">
            <label className="field-label">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="input"
              placeholder="z. B. Retainer 2026"
            />
          </div>
          <div className="field">
            <label className="field-label">Budget Owner</label>
            <select className="select" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label}
                </option>
              ))}
            </select>
          </div>
          <label className="row" style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
            <input type="checkbox" checked={isRetainer} onChange={(event) => setIsRetainer(event.target.checked)} />
            Retainer (wiederkehrendes Kontingent)
          </label>
          {isRetainer && (
            <div className="field">
              <label className="field-label">Intervall</label>
              <select
                className="select"
                value={recurrenceInterval}
                onChange={(event) => setRecurrenceInterval(event.target.value as "weekly" | "monthly")}
              >
                <option value="monthly">Monatlich</option>
                <option value="weekly">Wöchentlich</option>
              </select>
            </div>
          )}
          {error && <p className="field-error">{error}</p>}
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <button type="submit" className="btn btn-primary">
              Anlegen
            </button>
            <button type="button" onClick={() => setCreating(false)} className="btn btn-ghost">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {budgets.length === 0 ? (
        <div className="empty-state">
          <h3>Noch keine Budgets</h3>
          <p>Lege das erste Budget für dieses Projekt an.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Owner</th>
                <th>Sections</th>
                <th style={{ textAlign: "right" }}>Budget Total</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((budget) => (
                <tr key={budget.id}>
                  <td>
                    <Link href={`/financials/${projectId}/${budget.id}`} style={{ fontWeight: 600 }}>
                      {budget.title}
                    </Link>
                  </td>
                  <td className="text-muted">{budget.ownerLabel}</td>
                  <td className="coord">{budget.sectionCount}</td>
                  <td className="coord" style={{ textAlign: "right" }}>
                    {budget.budgetTotal.toFixed(2)}
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
