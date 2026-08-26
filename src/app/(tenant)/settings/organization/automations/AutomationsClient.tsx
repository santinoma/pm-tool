"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Trigger = "task_created" | "task_status_changed";
type ActionType = "assign_user" | "notify_user";
type StatusCategory = "not_started" | "started" | "done";

interface RuleAction {
  type: ActionType;
  targetUserLabel: string;
}

interface Rule {
  id: string;
  name: string;
  trigger: Trigger;
  conditionStatusCategory: StatusCategory | null;
  isEnabled: boolean;
  actions: RuleAction[];
}

interface UserOption {
  id: string;
  label: string;
}

const TRIGGER_LABELS: Record<Trigger, string> = {
  task_created: "Task erstellt",
  task_status_changed: "Task-Status geändert",
};

const ACTION_LABELS: Record<ActionType, string> = {
  assign_user: "Zuweisen an",
  notify_user: "Benachrichtigen",
};

const CATEGORY_LABELS: Record<StatusCategory, string> = {
  not_started: "Nicht begonnen",
  started: "In Arbeit",
  done: "Erledigt",
};

interface DraftAction {
  type: ActionType;
  targetUserId: string;
}

export function AutomationsClient({
  canManage,
  users,
  rules,
}: {
  canManage: boolean;
  users: UserOption[];
  rules: Rule[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<Trigger>("task_created");
  const [conditionCategory, setConditionCategory] = useState<StatusCategory | "">("");
  const [draftActions, setDraftActions] = useState<DraftAction[]>([
    { type: "assign_user", targetUserId: users[0]?.id ?? "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addDraftAction() {
    setDraftActions((current) => [...current, { type: "assign_user", targetUserId: users[0]?.id ?? "" }]);
  }

  function removeDraftAction(index: number) {
    setDraftActions((current) => current.filter((_, i) => i !== index));
  }

  function updateDraftAction(index: number, changes: Partial<DraftAction>) {
    setDraftActions((current) => current.map((action, i) => (i === index ? { ...action, ...changes } : action)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (draftActions.length === 0 || draftActions.some((action) => !action.targetUserId)) {
      setError("Jede Aktion braucht eine Zielperson.");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/tenant/automation-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        trigger,
        conditionStatusCategory: trigger === "task_status_changed" && conditionCategory ? conditionCategory : null,
        actions: draftActions,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Automation konnte nicht angelegt werden.");
      return;
    }
    setName("");
    setDraftActions([{ type: "assign_user", targetUserId: users[0]?.id ?? "" }]);
    router.refresh();
  }

  async function handleToggle(id: string, isEnabled: boolean) {
    await fetch(`/api/tenant/automation-rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled }),
    });
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tenant/automation-rules/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-2)" }}>Automations</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
        Erstelle Automationen, um Updates auszulösen, Benachrichtigungen zu senden oder Arbeit basierend auf
        Bedingungen zuzuweisen.
      </p>

      {canManage && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: "var(--space-8)" }}>
          <h2 style={{ marginBottom: "var(--space-4)" }}>Neue Automation</h2>

          <div className="field" style={{ marginBottom: "var(--space-4)" }}>
            <label className="field-label" htmlFor="automation-name">
              Name
            </label>
            <input
              id="automation-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="row" style={{ gap: "var(--space-4)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
            <div className="field">
              <label className="field-label" htmlFor="automation-trigger">
                Wenn
              </label>
              <select
                id="automation-trigger"
                className="select"
                value={trigger}
                onChange={(event) => setTrigger(event.target.value as Trigger)}
              >
                <option value="task_created">Task erstellt</option>
                <option value="task_status_changed">Task-Status geändert</option>
              </select>
            </div>

            {trigger === "task_status_changed" && (
              <div className="field">
                <label className="field-label" htmlFor="automation-condition">
                  Nur wenn neue Status-Kategorie
                </label>
                <select
                  id="automation-condition"
                  className="select"
                  value={conditionCategory}
                  onChange={(event) => setConditionCategory(event.target.value as StatusCategory | "")}
                >
                  <option value="">Beliebig</option>
                  <option value="not_started">Nicht begonnen</option>
                  <option value="started">In Arbeit</option>
                  <option value="done">Erledigt</option>
                </select>
              </div>
            )}
          </div>

          <span className="field-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>
            Dann
          </span>
          <div className="stack" style={{ gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            {draftActions.map((action, index) => (
              <div key={index} className="row" style={{ gap: "var(--space-2)" }}>
                <select
                  className="select"
                  value={action.type}
                  onChange={(event) => updateDraftAction(index, { type: event.target.value as ActionType })}
                >
                  <option value="assign_user">Zuweisen an</option>
                  <option value="notify_user">Benachrichtigen</option>
                </select>
                <select
                  className="select"
                  value={action.targetUserId}
                  onChange={(event) => updateDraftAction(index, { targetUserId: event.target.value })}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => removeDraftAction(index)} className="btn btn-ghost btn-sm">
                  Entfernen
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addDraftAction} className="btn btn-secondary btn-sm" style={{ marginBottom: "var(--space-4)" }}>
            + Aktion hinzufügen
          </button>

          {error && <p className="field-error" style={{ marginBottom: "var(--space-3)" }}>{error}</p>}

          <div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Automation anlegen
            </button>
          </div>
        </form>
      )}

      <h2 style={{ marginBottom: "var(--space-3)" }}>Bestehende Automationen</h2>
      {rules.length === 0 ? (
        <p className="text-muted">Noch keine Automationen angelegt.</p>
      ) : (
        <div className="stack" style={{ gap: "var(--space-3)" }}>
          {rules.map((rule) => (
            <div key={rule.id} className="widget-card">
              <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
                <strong>{rule.name}</strong>
                {canManage && (
                  <div className="row" style={{ gap: "var(--space-2)" }}>
                    <label className="row" style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                      <input
                        type="checkbox"
                        checked={rule.isEnabled}
                        onChange={(event) => handleToggle(rule.id, event.target.checked)}
                      />
                      Aktiv
                    </label>
                    <button type="button" onClick={() => handleDelete(rule.id)} className="btn btn-danger btn-sm">
                      Löschen
                    </button>
                  </div>
                )}
              </div>
              <p className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
                Wenn <strong>{TRIGGER_LABELS[rule.trigger]}</strong>
                {rule.conditionStatusCategory && (
                  <> (nur bei Kategorie „{CATEGORY_LABELS[rule.conditionStatusCategory]}“)</>
                )}
                , dann:{" "}
                {rule.actions
                  .map((action) => `${ACTION_LABELS[action.type]} ${action.targetUserLabel}`)
                  .join(", ")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
