"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SharedViewRow {
  id: string;
  token: string;
  statusCategoryFilter: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

export function SharedViewsPanel({ projectId, views }: { projectId: string; views: SharedViewRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [statusCategoryFilter, setStatusCategoryFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setSaving(true);
    const response = await fetch(`/api/tenant/projects/${projectId}/shared-views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusCategoryFilter: statusCategoryFilter || null }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Link konnte nicht erstellt werden.");
      return;
    }
    router.refresh();
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/tenant/shared-views/${id}`, { method: "PATCH" });
    router.refresh();
  }

  const shareOrigin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="container" style={{ paddingBottom: 0 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn btn-secondary btn-sm" style={{ marginBottom: "var(--space-4)" }}>
        Freigabe-Links {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="row" style={{ gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
            <select
              className="select"
              value={statusCategoryFilter}
              onChange={(event) => setStatusCategoryFilter(event.target.value)}
            >
              <option value="">Alle Status-Kategorien</option>
              <option value="not_started">Nicht begonnen</option>
              <option value="started">In Arbeit</option>
              <option value="done">Erledigt</option>
            </select>
            <button type="button" onClick={handleCreate} className="btn btn-primary btn-sm" disabled={saving}>
              Neuen Link erstellen
            </button>
          </div>
          {error && <p className="field-error" style={{ marginBottom: "var(--space-3)" }}>{error}</p>}

          {views.length === 0 ? (
            <p className="text-muted">Noch keine Freigabe-Links.</p>
          ) : (
            <ul className="list-plain">
              {views.map((view) => {
                const isRevoked = view.revokedAt !== null;
                const isExpired = view.expiresAt !== null && new Date(view.expiresAt).getTime() < Date.now();
                return (
                  <li key={view.id}>
                    <span className="coord" style={{ fontSize: "var(--text-sm)" }}>
                      {isRevoked ? (
                        <span className="text-muted">Widerrufen</span>
                      ) : isExpired ? (
                        <span className="text-muted">Abgelaufen</span>
                      ) : (
                        `${shareOrigin}/shared/${view.token}`
                      )}
                    </span>
                    {!isRevoked && !isExpired && (
                      <button type="button" onClick={() => handleRevoke(view.id)} className="btn btn-danger btn-sm">
                        Widerrufen
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
