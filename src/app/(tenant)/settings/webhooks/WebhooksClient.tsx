"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LegendKey } from "@/ui/components/LegendKey";

const EVENT_TYPES = [
  "task_created",
  "task_status_changed",
  "comment_added",
  "attachment_added",
  "wiki_page_created",
  "wiki_page_updated",
];

interface Delivery {
  id: string;
  attempt: number;
  success: boolean;
  statusCode: number | null;
  errorMessage: string | null;
  createdAt: string;
}

interface Endpoint {
  id: string;
  url: string;
  eventTypes: string[];
  enabled: boolean;
  recentDeliveries: Delivery[];
}

export function WebhooksClient({ endpoints }: { endpoints: Endpoint[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleType(type: string) {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNewSecret(null);

    const response = await fetch("/api/tenant/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, eventTypes: selectedTypes }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Erstellung fehlgeschlagen.");
      return;
    }
    setNewSecret(data.endpoint.secret);
    setUrl("");
    setSelectedTypes([]);
    router.refresh();
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    await fetch(`/api/tenant/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tenant/webhooks/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "760px" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Webhooks</h1>

      {endpoints.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: "var(--space-6)" }}>
          <h3>Noch keine Webhooks konfiguriert</h3>
          <p>Lege einen Endpunkt an, um Ereignisse dieses Tenants nach außen zu senden.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="card">
              <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
                <strong className="coord" style={{ fontSize: "var(--text-sm)" }}>
                  {endpoint.url}
                </strong>
                <LegendKey label={endpoint.enabled ? "aktiviert" : "deaktiviert"} variant={endpoint.enabled ? "done" : "default"} />
              </div>
              <p className="text-muted" style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
                Events: {endpoint.eventTypes.join(", ")}
              </p>
              <div className="row" style={{ gap: "var(--space-2)" }}>
                <button type="button" onClick={() => toggleEnabled(endpoint.id, !endpoint.enabled)} className="btn btn-secondary btn-sm">
                  {endpoint.enabled ? "Deaktivieren" : "Aktivieren"}
                </button>
                <button type="button" onClick={() => handleDelete(endpoint.id)} className="btn btn-danger btn-sm">
                  Löschen
                </button>
              </div>

              <h3 style={{ marginTop: "var(--space-4)", fontSize: "var(--text-sm)" }}>Letzte Zustellungen</h3>
              {endpoint.recentDeliveries.length === 0 ? (
                <p className="text-faint" style={{ fontSize: "var(--text-sm)" }}>Noch keine Zustellungen.</p>
              ) : (
                <ul className="list-plain" style={{ marginTop: "var(--space-2)" }}>
                  {endpoint.recentDeliveries.map((delivery) => (
                    <li key={delivery.id} style={{ display: "block" }}>
                      <LegendKey
                        label={`Versuch ${delivery.attempt}: ${delivery.success ? "erfolgreich" : "fehlgeschlagen"}`}
                        variant={delivery.success ? "done" : "danger"}
                      />
                      <span className="text-faint" style={{ marginLeft: "var(--space-2)", fontSize: "var(--text-xs)" }}>
                        {delivery.statusCode !== null ? `HTTP ${delivery.statusCode} · ` : ""}
                        {delivery.errorMessage ? `${delivery.errorMessage} · ` : ""}
                        {new Date(delivery.createdAt).toLocaleString("de-DE")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginBottom: "var(--space-4)" }}>Neuen Webhook anlegen</h2>
      <form onSubmit={handleCreate} className="stack" style={{ gap: "var(--space-4)", maxWidth: "480px" }}>
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/webhook"
          required
          className="input"
        />
        <div className="stack" style={{ gap: "var(--space-1)" }}>
          {EVENT_TYPES.map((type) => (
            <label key={type} className="row" style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
              <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} />
              <span className="coord">{type}</span>
            </label>
          ))}
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
          Anlegen
        </button>
      </form>

      {newSecret && (
        <div className="card" style={{ marginTop: "var(--space-5)", wordBreak: "break-all" }}>
          <p style={{ marginBottom: "var(--space-2)" }}>Secret (wird nur jetzt angezeigt, bitte speichern):</p>
          <code className="coord" style={{ fontSize: "var(--text-sm)" }}>{newSecret}</code>
        </div>
      )}
    </div>
  );
}
