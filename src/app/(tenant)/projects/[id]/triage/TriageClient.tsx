"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TriageTask {
  id: string;
  title: string;
}

export function TriageClient({
  projectId,
  defaultStatusId,
  tasks,
}: {
  projectId: string;
  defaultStatusId: string;
  tasks: TriageTask[];
}) {
  const router = useRouter();
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    router.refresh();
  }

  async function moveToBoard(taskId: string) {
    setError(null);
    const response = await fetch(`/api/tenant/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inTriage: false, statusId: defaultStatusId }),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Übernahme fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "620px" }}>
      <h1 style={{ marginBottom: "var(--space-1)" }}>Triage</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-5)" }}>
        Neue Tasks sichten, bevor sie ins Board wandern.
      </p>
      {error && <p className="field-error" style={{ marginBottom: "var(--space-4)" }}>{error}</p>}

      <form onSubmit={handleCreate} className="row" style={{ gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
        <input
          type="text"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Neuer Task…"
          required
          className="input"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary">
          Anlegen
        </button>
      </form>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <h3>Keine Tasks in der Triage</h3>
        </div>
      ) : (
        <ul className="list-plain">
          {tasks.map((task) => (
            <li key={task.id}>
              <span>{task.title}</span>
              <button type="button" onClick={() => moveToBoard(task.id)} className="btn btn-secondary btn-sm">
                Ins Board übernehmen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
