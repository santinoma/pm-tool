"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LogEntry {
  id: string;
  periodKey: string;
  answer: string;
  userLabel: string;
  createdAt: string;
}

interface Schedule {
  id: string;
  question: string;
  recurrence: string;
  pending: boolean;
  myAnswer: string;
  log: LogEntry[];
}

export function CheckInsClient({
  projectId,
  canManage,
  schedules,
}: {
  projectId: string;
  canManage: boolean;
  schedules: Schedule[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [newQuestion, setNewQuestion] = useState("");
  const [newRecurrence, setNewRecurrence] = useState("weekly");
  const [error, setError] = useState<string | null>(null);

  async function submitAnswer(scheduleId: string) {
    const answer = answers[scheduleId];
    if (!answer || answer.trim().length === 0) return;
    await fetch(`/api/tenant/check-ins/${scheduleId}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    router.refresh();
  }

  async function handleCreateSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/tenant/projects/${projectId}/check-ins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: newQuestion, recurrence: newRecurrence }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Erstellung fehlgeschlagen.");
      return;
    }
    setNewQuestion("");
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "700px" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Check-ins</h1>

      {schedules.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: "var(--space-6)" }}>
          <h3>Noch keine Check-in-Schedules</h3>
        </div>
      ) : (
        <div className="stack" style={{ gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
          {schedules.map((schedule) => (
            <div key={schedule.id} className="card">
              <h2 style={{ fontSize: "var(--text-md)" }}>
                {schedule.question} <small className="coord text-faint">({schedule.recurrence})</small>
              </h2>
              {schedule.pending ? (
                <div className="row" style={{ gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                  <input
                    type="text"
                    value={answers[schedule.id] ?? ""}
                    onChange={(event) => setAnswers((prev) => ({ ...prev, [schedule.id]: event.target.value }))}
                    placeholder="Deine Antwort…"
                    className="input"
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={() => submitAnswer(schedule.id)} className="btn btn-primary btn-sm">
                    Absenden
                  </button>
                </div>
              ) : (
                <p className="text-muted" style={{ marginTop: "var(--space-2)" }}>
                  Für diese Periode bereits beantwortet: „{schedule.myAnswer}“
                </p>
              )}

              <h3 style={{ marginTop: "var(--space-4)", fontSize: "var(--text-sm)" }}>Log</h3>
              {schedule.log.length === 0 ? (
                <p className="text-faint" style={{ fontSize: "var(--text-sm)" }}>Noch keine Antworten.</p>
              ) : (
                <ul className="list-plain" style={{ marginTop: "var(--space-2)" }}>
                  {schedule.log.map((entry) => (
                    <li key={entry.id}>
                      <span>
                        <span className="coord" style={{ marginRight: "var(--space-2)" }}>
                          [{entry.periodKey}]
                        </span>
                        {entry.userLabel}: {entry.answer}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <>
          <h2 style={{ marginBottom: "var(--space-3)" }}>Neues Check-in-Schedule anlegen</h2>
          <form onSubmit={handleCreateSchedule} className="row" style={{ gap: "var(--space-2)" }}>
            <input
              type="text"
              value={newQuestion}
              onChange={(event) => setNewQuestion(event.target.value)}
              placeholder="Frage, z. B. 'Was hast du diese Woche gemacht?'"
              required
              className="input"
              style={{ flex: 1 }}
            />
            <select className="select" value={newRecurrence} onChange={(event) => setNewRecurrence(event.target.value)}>
              <option value="daily">Täglich</option>
              <option value="weekly">Wöchentlich</option>
            </select>
            <button type="submit" className="btn btn-primary">
              Anlegen
            </button>
          </form>
          {error && <p className="field-error" style={{ marginTop: "var(--space-2)" }}>{error}</p>}
        </>
      )}
    </div>
  );
}
