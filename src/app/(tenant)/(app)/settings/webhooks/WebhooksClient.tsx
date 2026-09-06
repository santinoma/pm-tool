"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LegendKey } from "@/ui/components/LegendKey";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";

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
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Webhooks</h1>

      {endpoints.length === 0 ? (
        <div className="mb-6 rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Webhooks konfiguriert</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Lege einen Endpunkt an, um Ereignisse dieses Tenants nach außen zu senden.
          </p>
        </div>
      ) : (
        <div className="mb-10 flex flex-col gap-4">
          {endpoints.map((endpoint) => (
            <Card key={endpoint.id}>
              <CardContent>
                <div className="mb-2 flex items-center justify-between">
                  <strong className="font-mono text-sm">{endpoint.url}</strong>
                  <LegendKey label={endpoint.enabled ? "aktiviert" : "deaktiviert"} variant={endpoint.enabled ? "done" : "default"} />
                </div>
                <p className="mb-3 text-sm text-muted-foreground">Events: {endpoint.eventTypes.join(", ")}</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => toggleEnabled(endpoint.id, !endpoint.enabled)}>
                    {endpoint.enabled ? "Deaktivieren" : "Aktivieren"}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(endpoint.id)}>
                    Löschen
                  </Button>
                </div>

                <h3 className="mt-4 text-sm font-semibold">Letzte Zustellungen</h3>
                {endpoint.recentDeliveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground/70">Noch keine Zustellungen.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {endpoint.recentDeliveries.map((delivery) => (
                      <li key={delivery.id}>
                        <LegendKey
                          label={`Versuch ${delivery.attempt}: ${delivery.success ? "erfolgreich" : "fehlgeschlagen"}`}
                          variant={delivery.success ? "done" : "danger"}
                        />
                        <span className="ml-2 text-xs text-muted-foreground/70">
                          {delivery.statusCode !== null ? `HTTP ${delivery.statusCode} · ` : ""}
                          {delivery.errorMessage ? `${delivery.errorMessage} · ` : ""}
                          {new Date(delivery.createdAt).toLocaleString("de-DE")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold">Neuen Webhook anlegen</h2>
      <form onSubmit={handleCreate} className="flex max-w-xl flex-col gap-4">
        <Input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/webhook" required />
        <div className="flex flex-col gap-1.5">
          {EVENT_TYPES.map((type) => (
            <Label key={type} className="flex items-center gap-2 font-normal">
              <Checkbox checked={selectedTypes.includes(type)} onCheckedChange={() => toggleType(type)} />
              <span className="font-mono">{type}</span>
            </Label>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="self-start">
          Anlegen
        </Button>
      </form>

      {newSecret && (
        <Card className="mt-5">
          <CardContent className="break-all">
            <p className="mb-2 text-sm">Secret (wird nur jetzt angezeigt, bitte speichern):</p>
            <code className="font-mono text-sm">{newSecret}</code>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
