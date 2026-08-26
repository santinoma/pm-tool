"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: "project" | "task";
  id: string;
  title: string;
  projectId?: string;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "new-task">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showAdvancedHelp, setShowAdvancedHelp] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    function handleOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleOpenEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!open || mode !== "search" || query.trim().length === 0) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const response = await fetch(`/api/tenant/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results ?? []);
      }
    }, 150);
    return () => clearTimeout(timeout);
  }, [query, open, mode]);

  function navigateTo(result: SearchResult) {
    setOpen(false);
    setQuery("");
    if (result.type === "project") {
      router.push(`/projects/${result.id}/list`);
    } else if (result.projectId) {
      router.push(`/projects/${result.projectId}/list`);
    }
  }

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const searchResponse = await fetch(`/api/tenant/search?q=${encodeURIComponent(query)}`);
    const searchData = searchResponse.ok ? await searchResponse.json() : { results: [] };
    const firstProject = (searchData.results as SearchResult[] | undefined)?.find(
      (r) => r.type === "project",
    );

    const projectsResponse = await fetch("/api/tenant/projects");
    const projectsData = projectsResponse.ok ? await projectsResponse.json() : { projects: [] };
    const projectId = firstProject?.id ?? projectsData.projects?.[0]?.id;
    if (!projectId) {
      return;
    }

    await fetch("/api/tenant/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTaskTitle, projectId }),
    });

    setOpen(false);
    setNewTaskTitle("");
    setMode("search");
    router.refresh();
  }

  if (!open) {
    return null;
  }

  return (
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="cmdk-panel" onClick={(event) => event.stopPropagation()}>
        <div className="cmdk-tabs">
          <button
            type="button"
            onClick={() => setMode("search")}
            className={`cmdk-tab${mode === "search" ? " is-active" : ""}`}
          >
            Suche
          </button>
          <button
            type="button"
            onClick={() => setMode("new-task")}
            className={`cmdk-tab${mode === "new-task" ? " is-active" : ""}`}
          >
            Neuer Task
          </button>
        </div>

        {mode === "search" ? (
          <>
            <div style={{ position: "relative" }}>
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder='Projekte oder Tasks suchen… (z. B. status:done assignee:me)'
                className="cmdk-input"
              />
              <button
                type="button"
                onClick={() => setShowAdvancedHelp((current) => !current)}
                className="btn btn-ghost btn-sm"
                style={{ position: "absolute", right: "var(--space-3)", top: "50%", transform: "translateY(-50%)" }}
              >
                Advanced
              </button>
            </div>
            {showAdvancedHelp && (
              <div className="text-muted" style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <code className="coord">status:done</code>, <code className="coord">status:started</code>,{" "}
                  <code className="coord">status:not_started</code>
                </div>
                <div>
                  <code className="coord">assignee:me</code> oder <code className="coord">assignee:name</code>
                </div>
                <div>
                  <code className="coord">project:&quot;Projektname&quot;</code>
                </div>
                <div>Modifier kombinierbar, restlicher Text filtert den Titel.</div>
              </div>
            )}
            <ul style={{ listStyle: "none" }}>
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button type="button" onClick={() => navigateTo(result)} className="cmdk-result">
                    <span className="cmdk-result-type">
                      {result.type === "project" ? "Projekt" : "Task"}
                    </span>
                    {result.title}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <form onSubmit={handleCreateTask} style={{ padding: "var(--space-4)" }} className="stack">
            <input
              autoFocus
              type="text"
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="Titel des neuen Tasks…"
              required
              className="input"
            />
            <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
              Anlegen (in Triage des ersten Projekts)
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
