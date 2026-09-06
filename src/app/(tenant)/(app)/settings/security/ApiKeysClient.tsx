"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";

interface ApiKeyRow {
  id: string;
  name: string;
  tokenPrefix: string;
  scope: "read_only" | "read_write";
  revokedAt: string | null;
  lastUsedAt: string | null;
}

const SCOPE_LABELS: Record<ApiKeyRow["scope"], string> = {
  read_only: "Nur lesen",
  read_write: "Lesen und Schreiben",
};

export function ApiKeysClient({ keys }: { keys: ApiKeyRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"read_only" | "read_write">("read_write");
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
      body: JSON.stringify({ name, scope }),
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
    setScope("read_write");
    router.refresh();
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/tenant/api-keys/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">API-Keys</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Für die öffentliche API unter <code className="font-mono">/api/v1</code>.{" "}
        <Link href="/settings/organization/api-docs" className="text-primary hover:underline">
          API-Dokumentation ansehen
        </Link>
      </p>

      {newToken && (
        <Card className="mb-4">
          <CardContent>
            <p className="mb-2 text-sm">Token nur jetzt sichtbar — jetzt kopieren:</p>
            <code className="font-mono text-sm break-all">{newToken}</code>
          </CardContent>
        </Card>
      )}

      {keys.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">Noch keine API-Keys.</p>
      ) : (
        <ul className="mb-4 overflow-hidden rounded-lg border">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-0">
              <span>
                {key.name} <span className="font-mono text-xs text-muted-foreground">{key.tokenPrefix}…</span>{" "}
                <span className="text-muted-foreground">({SCOPE_LABELS[key.scope]})</span>
              </span>
              {key.revokedAt ? (
                <span className="text-xs text-muted-foreground">Widerrufen</span>
              ) : (
                <Button type="button" variant="destructive" size="sm" onClick={() => handleRevoke(key.id)}>
                  Widerrufen
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="flex flex-col gap-3">
        <Input
          type="text"
          placeholder="Name (z. B. CI Integration)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <fieldset className="border-0 p-0">
          <legend className="mb-2 text-sm text-muted-foreground">Berechtigung</legend>
          <Label className="mb-1 flex items-center gap-2 font-normal">
            <input
              type="radio"
              name="scope"
              value="read_write"
              checked={scope === "read_write"}
              onChange={() => setScope("read_write")}
            />
            Lesen und Schreiben
          </Label>
          <Label className="flex items-center gap-2 font-normal">
            <input
              type="radio"
              name="scope"
              value="read_only"
              checked={scope === "read_only"}
              onChange={() => setScope("read_only")}
            />
            Nur lesen
          </Label>
        </fieldset>
        <Button type="submit" disabled={saving} className="self-start">
          Erstellen
        </Button>
      </form>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
