"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectOption {
  id: string;
  name: string;
  tasks: { id: string; title: string }[];
}

interface EntryRow {
  id: string;
  label: string;
  durationMinutes: number;
  description: string | null;
}

interface RunningEntry {
  id: string;
  startedAt: string;
  label: string;
}

function formatElapsed(startedAt: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function TimeTrackingClient({
  allowProjectLevelTimeEntries,
  runningEntry,
  projects,
  entries,
}: {
  allowProjectLevelTimeEntries: boolean;
  runningEntry: RunningEntry | null;
  projects: ProjectOption[];
  entries: EntryRow[];
}) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(runningEntry ? formatElapsed(runningEntry.startedAt) : "");
  const [selectedTarget, setSelectedTarget] = useState("");
  const [manualDuration, setManualDuration] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runningEntry) return;
    const interval = setInterval(() => setElapsed(formatElapsed(runningEntry.startedAt)), 1000);
    return () => clearInterval(interval);
  }, [runningEntry]);

  function parseTarget(value: string): { taskId?: string; projectId?: string } {
    const [type, id] = value.split(":");
    return type === "task" ? { taskId: id } : { projectId: id };
  }

  async function handleStart() {
    setError(null);
    if (!selectedTarget) {
      setError("Bitte einen Task oder ein Projekt auswählen.");
      return;
    }
    const response = await fetch("/api/tenant/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parseTarget(selectedTarget)),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Timer konnte nicht gestartet werden.");
      return;
    }
    router.refresh();
  }

  async function handleStop() {
    await fetch("/api/tenant/timer/stop", { method: "POST" });
    router.refresh();
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!selectedTarget) {
      setError("Bitte einen Task oder ein Projekt auswählen.");
      return;
    }
    const response = await fetch("/api/tenant/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parseTarget(selectedTarget),
        durationMinutes: Number(manualDuration),
        description,
      }),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Eintrag konnte nicht angelegt werden.");
      return;
    }
    setManualDuration("");
    setDescription("");
    router.refresh();
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-6)" }}>Zeiterfassung</h1>

      {runningEntry ? (
        <div className="timer-banner">
          <span>
            <strong>{runningEntry.label}</strong>{" "}
            <span className="text-muted">läuft seit</span> <span className="timer-elapsed">{elapsed}</span>
          </span>
          <button type="button" onClick={handleStop} className="btn btn-secondary btn-sm">
            Stop
          </button>
        </div>
      ) : (
        <div className="row" style={{ gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          <select className="select" value={selectedTarget} onChange={(event) => setSelectedTarget(event.target.value)}>
            <option value="">Task/Projekt wählen…</option>
            {projects.map((project) => (
              <optgroup key={project.id} label={project.name}>
                {allowProjectLevelTimeEntries && <option value={`project:${project.id}`}>(ganzes Projekt)</option>}
                {project.tasks.map((task) => (
                  <option key={task.id} value={`task:${task.id}`}>
                    {task.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button type="button" onClick={handleStart} className="btn btn-primary">
            Timer starten
          </button>
        </div>
      )}

      {error && <p className="field-error" style={{ marginBottom: "var(--space-4)" }}>{error}</p>}

      <h2 style={{ marginBottom: "var(--space-3)" }}>Manueller Eintrag</h2>
      <form onSubmit={handleManualSubmit} className="row" style={{ gap: "var(--space-3)", marginBottom: "var(--space-8)" }}>
        <input
          type="number"
          placeholder="Minuten"
          value={manualDuration}
          onChange={(event) => setManualDuration(event.target.value)}
          required
          className="input"
          style={{ width: "110px" }}
        />
        <input
          type="text"
          placeholder="Beschreibung (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="input"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-secondary">
          Eintragen
        </button>
      </form>

      <h2 style={{ marginBottom: "var(--space-3)" }}>Meine letzten Einträge</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Task/Projekt</th>
              <th>Dauer</th>
              <th>Beschreibung</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.label}</td>
                <td className="coord">{entry.durationMinutes} min</td>
                <td className="text-muted">{entry.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
