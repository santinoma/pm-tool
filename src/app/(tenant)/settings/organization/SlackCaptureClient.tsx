"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Config {
  signingSecret: string;
  defaultProjectId: string;
  enabled: boolean;
}

export function SlackCaptureClient({
  config,
  projects,
}: {
  config: Config | null;
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [defaultProjectId, setDefaultProjectId] = useState(config?.defaultProjectId ?? projects[0]?.id ?? "");
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(data: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    const response = await fetch("/api/tenant/organization/slack-capture", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultProjectId, enabled, ...data }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "480px" }}>
      <h2 style={{ marginBottom: "var(--space-3)" }}>Slack-to-Issue Capture</h2>
      <p className="text-muted" style={{ marginBottom: "var(--space-4)", fontSize: "var(--text-sm)" }}>
        Externe Nachrichten (z. B. per Slack-Slash-Command) über einen signierten Endpunkt in Tasks
        umwandeln.
      </p>

      <div className="field" style={{ marginBottom: "var(--space-4)" }}>
        <label className="field-label" htmlFor="slack-default-project">
          Standard-Projekt
        </label>
        <select
          id="slack-default-project"
          className="select"
          value={defaultProjectId}
          onChange={(event) => {
            setDefaultProjectId(event.target.value);
            patch({ defaultProjectId: event.target.value });
          }}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <label className="row" style={{ gap: "var(--space-3)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={(event) => {
            setEnabled(event.target.checked);
            patch({ enabled: event.target.checked });
          }}
        />
        Slack-Capture aktivieren
      </label>

      {config && (
        <div className="card">
          <p className="field-hint" style={{ marginBottom: "var(--space-2)" }}>
            Signing Secret (für die Signaturprüfung eingehender Requests):
          </p>
          <code className="coord" style={{ wordBreak: "break-all" }}>{config.signingSecret}</code>
        </div>
      )}

      {error && <p className="field-error" style={{ marginTop: "var(--space-3)" }}>{error}</p>}
    </div>
  );
}
