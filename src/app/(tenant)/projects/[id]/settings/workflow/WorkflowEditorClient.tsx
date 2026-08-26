"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface StatusRow {
  id: string;
  name: string;
  category: string;
  position: number;
  isDefault: boolean;
}

interface CustomFieldRow {
  id: string;
  label: string;
}

interface TransitionRuleRow {
  id: string;
  fromStatusName: string | null;
  toStatusName: string;
  requiredFieldKeys: string[];
}

const BUILT_IN_FIELD_OPTIONS = [
  { key: "assignee", label: "Zuständige Person" },
  { key: "dueDate", label: "Fälligkeitsdatum" },
  { key: "estimatedHours", label: "Geschätzte Stunden" },
];

export function WorkflowEditorClient({
  projectId,
  canManage,
  statuses,
  customFields,
  transitionRules,
}: {
  projectId: string;
  canManage: boolean;
  statuses: StatusRow[];
  customFields: CustomFieldRow[];
  transitionRules: TransitionRuleRow[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("not_started");
  const [error, setError] = useState<string | null>(null);

  const [ruleFromStatusId, setRuleFromStatusId] = useState("");
  const [ruleToStatusId, setRuleToStatusId] = useState(statuses[0]?.id ?? "");
  const [ruleFieldKeys, setRuleFieldKeys] = useState<string[]>([]);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);

  const fieldLabel = (key: string) =>
    BUILT_IN_FIELD_OPTIONS.find((option) => option.key === key)?.label ??
    customFields.find((field) => `custom:${field.id}` === key)?.label ??
    key;

  function toggleFieldKey(key: string) {
    setRuleFieldKeys((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  async function handleAddRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRuleError(null);
    if (ruleFieldKeys.length === 0) {
      setRuleError("Mindestens ein Pflichtfeld auswählen.");
      return;
    }
    setRuleSaving(true);
    const response = await fetch(`/api/tenant/projects/${projectId}/transition-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromStatusId: ruleFromStatusId || null,
        toStatusId: ruleToStatusId,
        requiredFieldKeys: ruleFieldKeys,
      }),
    });
    setRuleSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setRuleError(body.error ?? "Regel konnte nicht angelegt werden.");
      return;
    }
    setRuleFieldKeys([]);
    router.refresh();
  }

  async function handleDeleteRule(ruleId: string) {
    await fetch(`/api/tenant/projects/${projectId}/transition-rules/${ruleId}`, { method: "DELETE" });
    router.refresh();
  }

  async function patchStatus(statusId: string, data: Record<string, unknown>) {
    setError(null);
    const response = await fetch(`/api/tenant/projects/${projectId}/statuses/${statusId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Änderung fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function deleteStatus(statusId: string) {
    setError(null);
    const response = await fetch(`/api/tenant/projects/${projectId}/statuses/${statusId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Löschen fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function moveStatus(index: number, direction: -1 | 1) {
    const target = statuses[index + direction];
    const current = statuses[index];
    if (!target) return;
    await patchStatus(current.id, { position: target.position });
    await patchStatus(target.id, { position: current.position });
  }

  async function handleAddStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/tenant/projects/${projectId}/statuses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, category: newCategory }),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Status konnte nicht angelegt werden.");
      return;
    }
    setNewName("");
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "620px" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Status-Workflow</h1>
      {error && <p className="field-error" style={{ marginBottom: "var(--space-4)" }}>{error}</p>}

      <ul className="list-plain" style={{ marginBottom: "var(--space-8)" }}>
        {statuses.map((status, index) => (
          <li key={status.id} style={{ gap: "var(--space-2)" }}>
            <span className="row" style={{ gap: "var(--space-2)", flex: 1 }}>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveStatus(index, -1)}
                aria-label="Nach oben"
                className="btn btn-ghost btn-sm"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === statuses.length - 1}
                onClick={() => moveStatus(index, 1)}
                aria-label="Nach unten"
                className="btn btn-ghost btn-sm"
              >
                ↓
              </button>
              <input
                type="text"
                defaultValue={status.name}
                onBlur={(event) =>
                  event.target.value !== status.name && patchStatus(status.id, { name: event.target.value })
                }
                className="input"
                style={{ height: "30px", width: "160px" }}
              />
              <select
                className="select"
                style={{ height: "30px" }}
                defaultValue={status.category}
                onChange={(event) => patchStatus(status.id, { category: event.target.value })}
              >
                <option value="not_started">not_started</option>
                <option value="started">started</option>
                <option value="done">done</option>
              </select>
              {status.isDefault && <span title="Default-Status für neue Tasks">★</span>}
            </span>
            <button type="button" onClick={() => deleteStatus(status.id)} className="btn btn-danger btn-sm">
              Löschen
            </button>
          </li>
        ))}
      </ul>

      <h2 style={{ marginBottom: "var(--space-3)" }}>Neuer Status</h2>
      <form onSubmit={handleAddStatus} className="row" style={{ gap: "var(--space-2)" }}>
        <input
          type="text"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Name"
          required
          className="input"
        />
        <select className="select" value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>
          <option value="not_started">not_started</option>
          <option value="started">started</option>
          <option value="done">done</option>
        </select>
        <button type="submit" className="btn btn-primary">
          Hinzufügen
        </button>
      </form>

      <h2 style={{ marginTop: "var(--space-10)", marginBottom: "var(--space-3)" }}>Übergangsregeln</h2>
      <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>
        Lege Pflichtfelder fest, die beim Wechsel in einen Status gesetzt sein müssen.
      </p>

      {transitionRules.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
          Noch keine Übergangsregeln.
        </p>
      ) : (
        <ul className="list-plain" style={{ marginBottom: "var(--space-6)" }}>
          {transitionRules.map((rule) => (
            <li key={rule.id}>
              <span>
                {rule.fromStatusName ?? "Beliebig"} → {rule.toStatusName}: {rule.requiredFieldKeys.map(fieldLabel).join(", ")}
              </span>
              {canManage && (
                <button type="button" onClick={() => handleDeleteRule(rule.id)} className="btn btn-danger btn-sm">
                  Löschen
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={handleAddRule} className="card">
          <h3 style={{ marginBottom: "var(--space-4)" }}>Neue Übergangsregel</h3>
          <div className="row" style={{ gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
            <div className="field">
              <label className="field-label" htmlFor="rule-from">
                Von
              </label>
              <select
                id="rule-from"
                className="select"
                value={ruleFromStatusId}
                onChange={(event) => setRuleFromStatusId(event.target.value)}
              >
                <option value="">Beliebig</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="rule-to">
                Nach
              </label>
              <select
                id="rule-to"
                className="select"
                value={ruleToStatusId}
                onChange={(event) => setRuleToStatusId(event.target.value)}
              >
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="field-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>
            Pflichtfelder
          </span>
          <div className="stack" style={{ gap: "var(--space-1)", marginBottom: "var(--space-4)" }}>
            {BUILT_IN_FIELD_OPTIONS.map((option) => (
              <label key={option.key} className="row" style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                <input
                  type="checkbox"
                  checked={ruleFieldKeys.includes(option.key)}
                  onChange={() => toggleFieldKey(option.key)}
                />
                {option.label}
              </label>
            ))}
            {customFields.map((field) => (
              <label
                key={field.id}
                className="row"
                style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)" }}
              >
                <input
                  type="checkbox"
                  checked={ruleFieldKeys.includes(`custom:${field.id}`)}
                  onChange={() => toggleFieldKey(`custom:${field.id}`)}
                />
                {field.label}
              </label>
            ))}
          </div>

          {ruleError && <p className="field-error" style={{ marginBottom: "var(--space-3)" }}>{ruleError}</p>}

          <button type="submit" className="btn btn-primary" disabled={ruleSaving}>
            Regel anlegen
          </button>
        </form>
      )}
    </div>
  );
}
