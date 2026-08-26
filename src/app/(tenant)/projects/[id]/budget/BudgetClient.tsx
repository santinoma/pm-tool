"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Budget {
  budgetHours: number | null;
  budgetAmount: number | null;
  hourlyRate: number | null;
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  return `${amount.toFixed(2)} ${currency}`;
}

export function BudgetClient({
  projectId,
  canEdit,
  currency,
  budget,
  actualHours,
  actualAmount,
}: {
  projectId: string;
  canEdit: boolean;
  currency: string;
  budget: Budget;
  actualHours: number;
  actualAmount: number | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [budgetHours, setBudgetHours] = useState(budget.budgetHours?.toString() ?? "");
  const [budgetAmount, setBudgetAmount] = useState(budget.budgetAmount?.toString() ?? "");
  const [hourlyRate, setHourlyRate] = useState(budget.hourlyRate?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  function toNullableNumber(value: string): number | null {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/tenant/projects/${projectId}/budget`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budgetHours: toNullableNumber(budgetHours),
        budgetAmount: toNullableNumber(budgetAmount),
        hourlyRate: toNullableNumber(hourlyRate),
      }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  const hoursPercent = budget.budgetHours && budget.budgetHours > 0 ? (actualHours / budget.budgetHours) * 100 : null;
  const amountPercent =
    budget.budgetAmount && budget.budgetAmount > 0 && actualAmount !== null
      ? (actualAmount / budget.budgetAmount) * 100
      : null;

  return (
    <div className="container" style={{ maxWidth: "620px" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Budget</h1>

      <div className="card">
        <div className="scale-row">
          <div className="scale-row-labels">
            <span>Stunden</span>
            <span className="coord">
              {actualHours.toFixed(1)}h{budget.budgetHours !== null ? ` / ${budget.budgetHours}h` : ""}
            </span>
          </div>
          {hoursPercent !== null && (
            <div className="scale-bar">
              <div
                className={`scale-bar-fill${hoursPercent > 100 ? " is-over" : ""}`}
                style={{ width: `${Math.min(100, hoursPercent)}%` }}
              />
            </div>
          )}
        </div>
        <div className="scale-row">
          <div className="scale-row-labels">
            <span>Betrag</span>
            <span className="coord">
              {formatAmount(actualAmount, currency)}
              {budget.budgetAmount !== null ? ` / ${formatAmount(budget.budgetAmount, currency)}` : ""}
            </span>
          </div>
          {amountPercent !== null && (
            <div className="scale-bar">
              <div
                className={`scale-bar-fill${amountPercent > 100 ? " is-over" : ""}`}
                style={{ width: `${Math.min(100, amountPercent)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {canEdit &&
        (editing ? (
          <div className="stack" style={{ gap: "var(--space-4)", marginTop: "var(--space-6)", maxWidth: "320px" }}>
            <div className="field">
              <label className="field-label">Budget-Stunden</label>
              <input
                type="number"
                value={budgetHours}
                onChange={(event) => setBudgetHours(event.target.value)}
                className="input"
              />
            </div>
            <div className="field">
              <label className="field-label">Budget-Betrag ({currency})</label>
              <input
                type="number"
                value={budgetAmount}
                onChange={(event) => setBudgetAmount(event.target.value)}
                className="input"
              />
            </div>
            <div className="field">
              <label className="field-label">Stundensatz ({currency})</label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(event) => setHourlyRate(event.target.value)}
                className="input"
              />
            </div>
            <div className="row" style={{ gap: "var(--space-2)" }}>
              <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary">
                Speichern
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost">
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="btn btn-secondary" style={{ marginTop: "var(--space-6)" }}>
            Budget bearbeiten
          </button>
        ))}
    </div>
  );
}
