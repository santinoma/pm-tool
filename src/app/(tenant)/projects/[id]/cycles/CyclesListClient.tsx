"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CycleRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export function CyclesListClient({
  projectId,
  canManage,
  cycles,
}: {
  projectId: string;
  canManage: boolean;
  cycles: CycleRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch(`/api/tenant/projects/${projectId}/cycles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startDate, endDate }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Cycle konnte nicht angelegt werden.");
      return;
    }
    setName("");
    setStartDate("");
    setEndDate("");
    router.refresh();
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-6)" }}>Cycles</h1>

      {cycles.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
          Noch keine Cycles.
        </p>
      ) : (
        <ul className="list-plain" style={{ marginBottom: "var(--space-8)" }}>
          {cycles.map((cycle) => (
            <li key={cycle.id}>
              <Link href={`/projects/${projectId}/cycles/${cycle.id}`}>{cycle.name}</Link>
              <span className="coord text-muted">
                {cycle.startDate} – {cycle.endDate}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <h2 style={{ marginBottom: "var(--space-4)" }}>Neuer Cycle</h2>
          <form onSubmit={handleSubmit} className="row" style={{ gap: "var(--space-3)", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="input"
            />
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
              className="input"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
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
