"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
import { Dialog, DialogContent, DialogTitle } from "@/ui/shadcn/components/dialog";
import { Input } from "@/ui/shadcn/components/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/shadcn/components/tabs";

interface SearchResult {
  type: "project" | "task";
  id: string;
  title: string;
  projectId?: string;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "new-task" | "create">("search");
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
      const timeout = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(timeout);
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

  // "Neuer Task" und "Neue Wiki-Seite" brauchen beide einen Projekt-Kontext (Task-Erstellung
  // läuft immer über ein Projekt, Wiki-Seiten hängen an /projects/[id]/wiki/new). Die Palette
  // selbst kennt kein "aktuelles" Projekt, daher greifen wir zum naheliegendsten: das zuletzt
  // angelegte Projekt des Nutzers. Von dort aus öffnet sich der bestehende Erstellungsflow
  // (Task-Liste mit ?newTask=1 → NewTaskModal öffnet automatisch; bzw. die Wiki-"Neue Seite"-Seite),
  // statt eine zweite, redundante Erstell-UI in der Palette selbst nachzubauen.
  async function resolveQuickCreateProjectId(): Promise<string | null> {
    const response = await fetch("/api/tenant/projects");
    if (!response.ok) return null;
    const data = await response.json();
    return data.projects?.[0]?.id ?? null;
  }

  async function handleQuickCreateTask() {
    const projectId = await resolveQuickCreateProjectId();
    setOpen(false);
    setMode("search");
    if (projectId) {
      router.push(`/projects/${projectId}/list?newTask=1`);
    } else {
      router.push("/projects");
    }
  }

  function handleQuickCreateProject() {
    setOpen(false);
    setMode("search");
    router.push("/projects/new");
  }

  async function handleQuickCreateWikiPage() {
    const projectId = await resolveQuickCreateProjectId();
    setOpen(false);
    setMode("search");
    if (projectId) {
      router.push(`/projects/${projectId}/wiki/new`);
    } else {
      router.push("/projects");
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Befehlspalette</DialogTitle>
        <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
          <TabsList className="w-full border-b px-2">
            <TabsTrigger value="search">Suche</TabsTrigger>
            <TabsTrigger value="new-task">Neuer Task</TabsTrigger>
            <TabsTrigger value="create">Quick Add</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-0">
            <div className="relative">
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder='Projekte oder Tasks suchen… (z. B. status:done assignee:me)'
                className="h-12 rounded-none border-0 border-b px-4 focus-visible:ring-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedHelp((current) => !current)}
                className="absolute top-1/2 right-3 -translate-y-1/2"
              >
                Advanced
              </Button>
            </div>
            {showAdvancedHelp && (
              <div className="border-b px-4 py-3 text-sm text-muted-foreground">
                <div>
                  <code className="font-mono">status:done</code>, <code className="font-mono">status:started</code>,{" "}
                  <code className="font-mono">status:not_started</code>
                </div>
                <div>
                  <code className="font-mono">assignee:me</code> oder <code className="font-mono">assignee:name</code>
                </div>
                <div>
                  <code className="font-mono">project:&quot;Projektname&quot;</code>
                </div>
                <div>Modifier kombinierbar, restlicher Text filtert den Titel.</div>
              </div>
            )}
            <ul className="max-h-80 overflow-y-auto">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    onClick={() => navigateTo(result)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted/50"
                  >
                    <span className="text-xs text-muted-foreground">{result.type === "project" ? "Projekt" : "Task"}</span>
                    {result.title}
                  </button>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="create" className="mt-0 flex flex-col gap-2 p-4">
            <Button type="button" variant="outline" className="justify-start" onClick={handleQuickCreateTask}>
              Neuer Task
            </Button>
            <Button type="button" variant="outline" className="justify-start" onClick={handleQuickCreateProject}>
              Neues Projekt
            </Button>
            <Button type="button" variant="outline" className="justify-start" onClick={handleQuickCreateWikiPage}>
              Neue Wiki-Seite
            </Button>
          </TabsContent>

          <TabsContent value="new-task" className="mt-0 p-4">
            <form onSubmit={handleCreateTask} className="flex flex-col gap-3">
              <Input
                autoFocus
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Titel des neuen Tasks…"
                required
              />
              <Button type="submit">Anlegen (in Erfassung des ersten Projekts)</Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
