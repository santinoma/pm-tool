"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Template {
  key: string;
  name: string;
  description: string;
  category: string;
  urlPlaceholder: string;
  installed: boolean;
}

export function IntegrationsMarketplaceClient({
  canManage,
  templates,
}: {
  canManage: boolean;
  templates: Template[];
}) {
  const router = useRouter();
  const [installingKey, setInstallingKey] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleInstall(templateKey: string) {
    setError(null);
    if (!url.trim()) {
      setError("URL ist erforderlich.");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/tenant/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateKey, url }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Installation fehlgeschlagen.");
      return;
    }
    setInstallingKey(null);
    setUrl("");
    router.refresh();
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-2)" }}>Integrations-Marktplatz</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
        Vordefinierte Integrationen, die im Hintergrund einen Webhook-Endpunkt einrichten. Details unter{" "}
        Settings → Organization → Webhooks.
      </p>

      <div className="widget-grid">
        {templates.map((template) => (
          <div key={template.key} className="widget-card">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
              <strong>{template.name}</strong>
              {template.installed && <span className="text-muted" style={{ fontSize: "var(--text-xs)" }}>Installiert</span>}
            </div>
            <p className="text-muted" style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
              {template.description}
            </p>

            {canManage && !template.installed && (
              <>
                {installingKey === template.key ? (
                  <div className="stack" style={{ gap: "var(--space-2)" }}>
                    <input
                      type="url"
                      className="input"
                      placeholder={template.urlPlaceholder}
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                    />
                    <div className="row" style={{ gap: "var(--space-2)" }}>
                      <button
                        type="button"
                        onClick={() => handleInstall(template.key)}
                        className="btn btn-primary btn-sm"
                        disabled={saving}
                      >
                        Installieren
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInstallingKey(null);
                          setUrl("");
                        }}
                        className="btn btn-ghost btn-sm"
                      >
                        Abbrechen
                      </button>
                    </div>
                    {error && <p className="field-error">{error}</p>}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setInstallingKey(template.key);
                      setUrl("");
                      setError(null);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Installieren
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
