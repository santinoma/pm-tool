"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Input } from "@/ui/shadcn/components/input";

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
    <div className="pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Integrations-Marktplatz</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Vordefinierte Integrationen, die im Hintergrund einen Webhook-Endpunkt einrichten. Details unter Settings →
        Organization → Webhooks.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.key}>
            <CardContent>
              <div className="mb-2 flex items-center justify-between">
                <strong className="text-sm">{template.name}</strong>
                {template.installed && <span className="text-xs text-muted-foreground">Installiert</span>}
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{template.description}</p>

              {canManage && !template.installed && (
                <>
                  {installingKey === template.key ? (
                    <div className="flex flex-col gap-2">
                      <Input placeholder={template.urlPlaceholder} value={url} onChange={(event) => setUrl(event.target.value)} />
                      <div className="flex gap-2">
                        <Button type="button" size="sm" disabled={saving} onClick={() => handleInstall(template.key)}>
                          Installieren
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setInstallingKey(null);
                            setUrl("");
                          }}
                        >
                          Abbrechen
                        </Button>
                      </div>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInstallingKey(template.key);
                        setUrl("");
                        setError(null);
                      }}
                    >
                      Installieren
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
