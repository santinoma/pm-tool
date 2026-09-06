"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";

interface CycleRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export function CyclesListClient({
  projectId,
  canManage,
  cycles,
}: {
  projectId: string;
  canManage: boolean;
  cycles: CycleRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rolloverNotice, setRolloverNotice] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setRolloverNotice(null);
    setSaving(true);
    const response = await fetch(`/api/tenant/projects/${projectId}/cycles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startDate, endDate }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Cycle konnte nicht angelegt werden.");
      return;
    }
    const body = await response.json().catch(() => ({}));
    if (typeof body.rolledOverCount === "number" && body.rolledOverCount > 0) {
      setRolloverNotice(
        `${body.rolledOverCount} unerledigte ${body.rolledOverCount === 1 ? "Task wurde" : "Tasks wurden"} aus dem vorherigen Cycle übernommen.`,
      );
    }
    setName("");
    setStartDate("");
    setEndDate("");
    router.refresh();
  }

  return (
    <div className="pb-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Cycles</h1>

      {cycles.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Noch keine Cycles.</p>
      ) : (
        <ul className="mb-8 flex flex-col gap-1">
          {cycles.map((cycle) => (
            <li key={cycle.id} className="flex items-center justify-between gap-3 border-b py-2.5 text-sm last:border-0">
              <Link href={`/projects/${projectId}/cycles/${cycle.id}`} className="font-medium hover:text-primary hover:underline">
                {cycle.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {cycle.startDate} – {cycle.endDate}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <h2 className="mb-4 text-lg font-semibold">Neuer Cycle</h2>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
            <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required className="w-48" />
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required className="w-auto" />
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required className="w-auto" />
            <Button type="submit" loading={saving}>
              Anlegen
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {rolloverNotice && <p className="mt-3 text-sm text-muted-foreground">↻ {rolloverNotice}</p>}
        </>
      )}
    </div>
  );
}
