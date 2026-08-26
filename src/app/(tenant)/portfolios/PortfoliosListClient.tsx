"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PortfolioRow {
  id: string;
  name: string;
  projectCount: number;
  goalCount: number;
  progress: number;
}

export function PortfoliosListClient({
  portfolios,
  canManage,
  allProjects,
}: {
  portfolios: PortfolioRow[];
  canManage: boolean;
  allProjects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Portfolio konnte nicht angelegt werden.");
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h1>Portfolios</h1>
          <p className="text-muted" style={{ marginTop: "var(--space-1)" }}>
            Projekte zu übergreifenden Zielen bündeln.
          </p>
        </div>
      </div>

      {allProjects.length === 0 && (
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>
          Es existieren noch keine Projekte.
        </p>
      )}

      {portfolios.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
          Noch keine Portfolios.
        </p>
      ) : (
        <ul className="list-plain" style={{ marginBottom: "var(--space-8)" }}>
          {portfolios.map((portfolio) => (
            <li key={portfolio.id}>
              <Link href={`/portfolios/${portfolio.id}`}>{portfolio.name}</Link>
              <span className="coord text-muted">
                {portfolio.projectCount} Projekte · {portfolio.goalCount} Ziele · {portfolio.progress}% erledigt
              </span>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <h2 style={{ marginBottom: "var(--space-4)" }}>Neues Portfolio</h2>
          <form onSubmit={handleSubmit} className="row" style={{ gap: "var(--space-3)" }}>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
