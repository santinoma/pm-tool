"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ApiKeyRow {
  id: string;
  name: string;
  tokenPrefix: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

export function ApiKeysClient({ keys }: { keys: ApiKeyRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "API-Key konnte nicht erstellt werden.");
      return;
    }
    const data = await response.json();
    setNewToken(data.token);
    setName("");
    router.refresh();
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/tenant/api-keys/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "480px" }}>
      <h2 style={{ marginBottom: "var(--space-3)" }}>API-Keys</h2>
      <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>
        Für die öffentliche API unter <code className="coord">/api/v1</code>.
      </p>

      {newToken && (
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <p style={{ marginBottom: "var(--space-2)" }}>
            Token nur jetzt sichtbar — jetzt kopieren:
          </p>
          <code className="coord" style={{ wordBreak: "break-all" }}>{newToken}</code>
        </div>
      )}

      {keys.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>
          Noch keine API-Keys.
        </p>
      ) : (
        <ul className="list-plain" style={{ marginBottom: "var(--space-4)" }}>
          {keys.map((key) => (
            <li key={key.id}>
              <span>
                {key.name} <span className="coord text-muted">{key.tokenPrefix}…</span>
              </span>
              {key.revokedAt ? (
                <span className="text-muted">Widerrufen</span>
              ) : (
                <button type="button" onClick={() => handleRevoke(key.id)} className="btn btn-danger btn-sm">
                  Widerrufen
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="row" style={{ gap: "var(--space-3)" }}>
        <input
          type="text"
          className="input"
          placeholder="Name (z. B. CI Integration)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={saving}>
          Erstellen
        </button>
      </form>
      {error && <p className="field-error" style={{ marginTop: "var(--space-3)" }}>{error}</p>}
    </div>
  );
}
