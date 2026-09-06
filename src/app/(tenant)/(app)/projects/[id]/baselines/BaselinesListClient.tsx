"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";

interface BaselineRow {
  id: string;
  name: string;
  createdAt: string;
}

export function BaselinesListClient({
  projectId,
  canManage,
  baselines,
}: {
  projectId: string;
  canManage: boolean;
  baselines: BaselineRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch(`/api/tenant/projects/${projectId}/baselines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Baseline konnte nicht angelegt werden.");
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div className="pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Baselines</h1>
      <p className="mb-6 max-w-xl text-sm text-muted-foreground">
        Ein Baseline-Snapshot friert den aktuellen Zeitplan ein — spätere Abweichungen (Terminverschiebung,
        Aufwandsänderung, Statuswechsel) lassen sich damit sichtbar machen.
      </p>

      {baselines.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Noch keine Baselines.</p>
      ) : (
        <ul className="mb-8 flex flex-col gap-1">
          {baselines.map((baseline) => (
            <li key={baseline.id} className="flex items-center justify-between gap-3 border-b py-2.5 text-sm last:border-0">
              <Link href={`/projects/${projectId}/baselines/${baseline.id}`} className="font-medium hover:text-primary hover:underline">
                {baseline.name}
              </Link>
              <span className="text-xs text-muted-foreground">{new Date(baseline.createdAt).toLocaleString("de-DE")}</span>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <h2 className="mb-4 text-lg font-semibold">Neue Baseline</h2>
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Input
              placeholder="Name (z. B. Kickoff-Plan)"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-64"
            />
            <Button type="submit" loading={saving}>
              Snapshot erstellen
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
