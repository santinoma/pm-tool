"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LegendKey } from "@/ui/components/LegendKey";

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

export function TaskLinksPanel({ taskId, links }: { taskId: string; links: LinkedTaskRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
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
    <div className="container" style={{ maxWidth: "720px" }}>
      <h2 style={{ marginBottom: "var(--space-3)" }}>Verlinkte Tasks</h2>

      {links.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>
          Noch keine verlinkten Tasks.
        </p>
      ) : (
        <ul className="list-plain" style={{ marginBottom: "var(--space-4)" }}>
          {links.map((link) => (
            <li key={link.linkId}>
              <span className="row" style={{ gap: "var(--space-2)" }}>
                <strong>{link.title}</strong>
                <span className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
                  {link.projectName}
                </span>
                <LegendKey label={link.statusName} category={link.statusCategory} />
                {link.assigneeLabel && <span className="text-muted">{link.assigneeLabel}</span>}
              </span>
              <button type="button" onClick={() => handleUnlink(link.linkId)} className="btn btn-ghost btn-sm">
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="field" style={{ maxWidth: "360px" }}>
        <label className="field-label" htmlFor="task-link-search">
          Task verlinken
        </label>
        <input
          id="task-link-search"
          type="text"
          className="input"
          placeholder="Titel suchen…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {results.length > 0 && (
        <ul className="list-plain" style={{ marginTop: "var(--space-2)", maxWidth: "360px" }}>
          {results.map((result) => (
            <li key={result.id}>
              <span>
                {result.title} <span className="text-muted">({result.projectName})</span>
              </span>
              <button type="button" onClick={() => handleLink(result.id)} className="btn btn-secondary btn-sm">
                Verlinken
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="field-error" style={{ marginTop: "var(--space-3)" }}>{error}</p>}
    </div>
  );
}
