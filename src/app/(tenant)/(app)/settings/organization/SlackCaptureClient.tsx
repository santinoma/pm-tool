"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

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
    <div>
      <h2 className="mb-3 text-lg font-semibold">Slack-to-Issue Capture</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Externe Nachrichten (z. B. per Slack-Slash-Command) über einen signierten Endpunkt in Tasks umwandeln.
      </p>

      <div className="mb-4 max-w-[280px]">
        <Label htmlFor="slack-default-project" className="mb-2 block">
          Standard-Projekt
        </Label>
        <Select
          value={defaultProjectId}
          onValueChange={(value) => {
            setDefaultProjectId(value);
            patch({ defaultProjectId: value });
          }}
        >
          <SelectTrigger id="slack-default-project" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Label className="mb-4 flex items-center gap-3 font-normal">
        <Checkbox
          checked={enabled}
          disabled={saving}
          onCheckedChange={(value) => {
            const next = value === true;
            setEnabled(next);
            patch({ enabled: next });
          }}
        />
        Slack-Capture aktivieren
      </Label>

      {config && (
        <Card>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">Signing Secret (für die Signaturprüfung eingehender Requests):</p>
            <code className="font-mono text-sm break-all">{config.signingSecret}</code>
          </CardContent>
        </Card>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
