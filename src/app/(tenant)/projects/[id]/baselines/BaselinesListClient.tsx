"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface BaselineRow {
  id: string;
  name: string;
  createdAt: string;
}

export function BaselinesListClient({
  projectId,
  canManage,
  baselines,
}: {
  projectId: string;
  canManage: boolean;
  baselines: BaselineRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch(`/api/tenant/projects/${projectId}/baselines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Baseline konnte nicht angelegt werden.");
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-2)" }}>Baselines</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
        Ein Baseline-Snapshot friert den aktuellen Zeitplan ein — spätere Abweichungen
        (Terminverschiebung, Aufwandsänderung, Statuswechsel) lassen sich damit sichtbar machen.
      </p>

      {baselines.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
          Noch keine Baselines.
        </p>
      ) : (
        <ul className="list-plain" style={{ marginBottom: "var(--space-8)" }}>
          {baselines.map((baseline) => (
            <li key={baseline.id}>
              <Link href={`/projects/${projectId}/baselines/${baseline.id}`}>{baseline.name}</Link>
              <span className="coord text-muted">{new Date(baseline.createdAt).toLocaleString("de-DE")}</span>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <h2 style={{ marginBottom: "var(--space-4)" }}>Neue Baseline</h2>
          <form onSubmit={handleSubmit} className="row" style={{ gap: "var(--space-3)" }}>
            <input
              type="text"
              placeholder="Name (z. B. Kickoff-Plan)"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="input"
            />
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Snapshot erstellen
            </button>
          </form>
          {error && <p className="field-error" style={{ marginTop: "var(--space-3)" }}>{error}</p>}
        </>
      )}
    </div>
  );
}
