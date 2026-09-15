"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LegendKey } from "@/ui/components/LegendKey";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";

interface LinkedTaskRow {
  linkId: string;
  taskId: string;
  title: string;
  statusName: string;
  statusCategory: "not_started" | "started" | "done";
  assigneeLabel: string | null;
  projectName: string;
}

interface SearchResult {
  id: string;
  title: string;
  projectName: string;
}

export function TaskLinksPanel({
  taskId,
  links,
  className = "mx-auto max-w-2xl pb-10",
}: {
  taskId: string;
  links: LinkedTaskRow[];
  className?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      const response = await fetch(`/api/tenant/tasks/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.tasks.filter((task: SearchResult) => task.id !== taskId));
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, taskId]);

  async function handleLink(targetTaskId: string) {
    setError(null);
    const response = await fetch(`/api/tenant/tasks/${taskId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetTaskId }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Verknüpfung konnte nicht angelegt werden.");
      return;
    }
    setQuery("");
    setResults([]);
    router.refresh();
  }

  async function handleUnlink(linkId: string) {
    await fetch(`/api/tenant/tasks/${taskId}/links/${linkId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className={className}>
      {links.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">Noch keine verlinkten Tasks.</p>
      ) : (
        <ul className="mb-4 flex flex-col gap-1">
          {links.map((link) => (
            <li key={link.linkId} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
              <span className="flex items-center gap-2">
                <strong>{link.title}</strong>
                <span className="text-muted-foreground">{link.projectName}</span>
                <LegendKey label={link.statusName} category={link.statusCategory} />
                {link.assigneeLabel && <span className="text-muted-foreground">{link.assigneeLabel}</span>}
              </span>
              <Button variant="ghost" size="sm" onClick={() => handleUnlink(link.linkId)}>
                Entfernen
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex max-w-xs flex-col gap-2">
        <Label htmlFor="task-link-search">Task verlinken</Label>
        <Input id="task-link-search" placeholder="Titel suchen…" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {results.length > 0 && (
        <ul className="mt-2 flex max-w-xs flex-col gap-1">
          {results.map((result) => (
            <li key={result.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {result.title} <span className="text-muted-foreground">({result.projectName})</span>
              </span>
              <Button variant="outline" size="sm" onClick={() => handleLink(result.id)}>
                Verlinken
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
