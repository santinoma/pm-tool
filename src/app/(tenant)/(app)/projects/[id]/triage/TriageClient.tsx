"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";

interface TriageTask {
  id: string;
  title: string;
}

export function TriageClient({
  projectId,
  defaultStatusId,
  tasks,
}: {
  projectId: string;
  defaultStatusId: string;
  tasks: TriageTask[];
}) {
  const router = useRouter();
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    const response = await fetch("/api/tenant/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, projectId }),
    });
    setCreating(false);
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Task konnte nicht angelegt werden.");
      return;
    }
    setNewTitle("");
    router.refresh();
  }

  async function moveToBoard(taskId: string) {
    setError(null);
    const response = await fetch(`/api/tenant/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inTriage: false, statusId: defaultStatusId }),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Übernahme fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl pb-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Erfassung</h1>
      <p className="mb-5 text-sm text-muted-foreground">Neue Tasks sichten, bevor sie ins Board wandern.</p>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <Input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Neuer Task…"
          required
          className="flex-1"
        />
        <Button type="submit" loading={creating}>
          Anlegen
        </Button>
      </form>

      {tasks.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Keine Tasks in der Erfassung</h3>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3 border-b py-2.5 text-sm last:border-0">
              <span>{task.title}</span>
              <Button variant="outline" size="sm" onClick={() => moveToBoard(task.id)}>
                Ins Board übernehmen
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
