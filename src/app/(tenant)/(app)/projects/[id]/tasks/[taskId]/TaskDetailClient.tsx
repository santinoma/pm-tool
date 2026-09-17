"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Link2, Maximize2, Paperclip, Play, Plus, Square, X } from "lucide-react";
import { FavoriteButton } from "@/ui/components/FavoriteButton";
import { CustomFieldInput, CustomFieldValueDisplay, type CustomFieldInputType } from "@/ui/components/CustomFieldInput";

import { Badge } from "@/ui/shadcn/components/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/ui/shadcn/components/breadcrumb";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/shadcn/components/tabs";
import { TaskLinksPanel } from "./TaskLinksPanel";
import { Textarea } from "@/ui/shadcn/components/textarea";

interface SubtaskRow {
  id: string;
  title: string;
  statusName: string;
  statusCategory: string;
  assigneeLabel: string | null;
}

interface TodoRow {
  id: string;
  title: string;
  isDone: boolean;
  assigneeId: string | null;
  assigneeLabel: string | null;
}

interface DependencyRow {
  dependencyId: string;
  id: string;
  title: string;
}

interface TimeEntryRow {
  id: string;
  userLabel: string;
  durationMinutes: number;
  description: string | null;
  createdAt: string;
}

interface ActivityEventRow {
  id: string;
  summary: string;
  actorLabel: string;
  createdAt: string;
}

interface CustomValueRow {
  fieldId: string;
  label: string;
  type: CustomFieldInputType;
  value: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  statusId: string;
  assigneeId: string | null;
  taskListGroupId: string | null;
  isKeyTask: boolean;
  isPrivate: boolean;
  isTemplate: boolean;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  parentTask: { id: string; title: string } | null;
  recurrence: { frequency: "daily" | "weekly" | "monthly" | "yearly"; interval: number } | null;
  recurrenceParent: { id: string; title: string } | null;
  subtasks: SubtaskRow[];
  blocking: DependencyRow[];
  blockedBy: DependencyRow[];
  customValues: CustomValueRow[];
  timeEntries: TimeEntryRow[];
  activityEvents: ActivityEventRow[];
  comments: { id: string; body: string; author: string; createdAt: string }[];
  attachments: { id: string; filename: string; sizeBytes: number; uploadedBy: string }[];
  tags: { id: string; name: string }[];
  subscribers: { userId: string; label: string }[];
  todos: TodoRow[];
}

interface TaskSearchResult {
  id: string;
  title: string;
  projectName: string;
}

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function formatMinutes(minutes: number): string {
  return `${(minutes / 60).toFixed(2)}h`;
}

function DependencyAddControl({ taskId, ownId, mode }: { taskId: string; ownId: string; mode: "blocking" | "blockedBy" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaskSearchResult[]>([]);
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
        setResults(data.tasks.filter((task: TaskSearchResult) => task.id !== ownId));
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, ownId]);

  async function handleLink(otherTaskId: string) {
    setError(null);
    const sourceId = mode === "blocking" ? taskId : otherTaskId;
    const targetId = mode === "blocking" ? otherTaskId : taskId;
    const response = await fetch(`/api/tenant/tasks/${sourceId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedTaskId: targetId }),
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

  return (
    <div className="mt-2">
      <Input placeholder="Task suchen…" value={query} onChange={(event) => setQuery(event.target.value)} className="max-w-xs" />
      {results.length > 0 && (
        <ul className="mt-1 flex max-w-xs flex-col gap-1">
          {results.map((result) => (
            <li key={result.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">
                {result.title} <span className="text-muted-foreground">({result.projectName})</span>
              </span>
              <Button variant="outline" size="sm" onClick={() => handleLink(result.id)}>
                Verlinken
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function TaskDetailClient({
  projectId,
  task,
  statuses,
  users,
  customFieldDefs = [],
  taskLists = [],
  isFavorite = false,
  currentUserId,
  linkedTasks = [],
}: {
  projectId: string;
  task: TaskDetail;
  statuses: { id: string; name: string }[];
  users: { id: string; label: string }[];
  customFieldDefs?: { id: string; type: CustomFieldInputType; options: string[] }[];
  taskLists?: { id: string; label: string }[];
  isFavorite?: boolean;
  currentUserId: string;
  linkedTasks?: React.ComponentProps<typeof TaskLinksPanel>["links"];
}) {
  const router = useRouter();
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [runningTimerTaskId, setRunningTimerTaskId] = useState<string | null>(null);
  const [timerBusy, setTimerBusy] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const isWatching = task.subscribers.some((subscriber) => subscriber.userId === currentUserId);
  const [uploading, setUploading] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(task.description ?? "");
  const [newTagName, setNewTagName] = useState("");
  const [subscribeUserId, setSubscribeUserId] = useState(users[0]?.id ?? "");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoAssigneeId, setNewTodoAssigneeId] = useState("__none__");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(task.recurrence?.frequency ?? "none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(task.recurrence?.interval ?? 1);
  const [customValues, setCustomValues] = useState<Record<string, string>>(
    Object.fromEntries(task.customValues.map((v) => [v.fieldId, v.value])),
  );
  const [timeDescription, setTimeDescription] = useState("");
  const [timeMinutes, setTimeMinutes] = useState("");

  // Reference action bar (§05 Task-Detail): "Timer ▶ … läuft unabhängig vom
  // Screen" — reuses the same global timer endpoints the App-Chrome widget
  // uses, so starting it here and stopping it from the header (or vice
  // versa) stay in sync via the shared TimeEntry row.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/tenant/timer")
      .then((response) => (response.ok ? response.json() : { entry: null }))
      .then((data) => {
        if (!cancelled) setRunningTimerTaskId(data.entry?.taskId ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [task.id]);

  async function handleToggleTimer() {
    setTimerBusy(true);
    try {
      if (runningTimerTaskId === task.id) {
        await fetch("/api/tenant/timer/stop", { method: "POST" });
        setRunningTimerTaskId(null);
      } else {
        await fetch("/api/tenant/timer/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: task.id, projectId }),
        });
        setRunningTimerTaskId(task.id);
      }
    } finally {
      setTimerBusy(false);
    }
  }

  async function handleToggleWatch() {
    if (isWatching) {
      await fetch(`/api/tenant/tasks/${task.id}/subscribers/${currentUserId}`, { method: "DELETE" });
    } else {
      await fetch(`/api/tenant/tasks/${task.id}/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
    }
    router.refresh();
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  }

  async function updateTask(data: Record<string, unknown>) {
    await fetch(`/api/tenant/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
  }

  async function handleSaveDescription() {
    await updateTask({ description: descriptionDraft });
    setEditingDescription(false);
  }

  async function handleCommentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/tenant/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Kommentar konnte nicht gespeichert werden.");
      return;
    }
    setCommentBody("");
    router.refresh();
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/tenant/tasks/${task.id}/attachments`, {
      method: "POST",
      body: formData,
    });
    setUploading(false);
    event.target.value = "";
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Upload fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function handleAddTag(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTagName.trim()) return;
    await fetch(`/api/tenant/tasks/${task.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    setNewTagName("");
    router.refresh();
  }

  async function handleRemoveTag(tagId: string) {
    await fetch(`/api/tenant/tasks/${task.id}/tags/${tagId}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleAddSubscriber() {
    if (!subscribeUserId) return;
    await fetch(`/api/tenant/tasks/${task.id}/subscribers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: subscribeUserId }),
    });
    router.refresh();
  }

  async function handleRemoveSubscriber(userId: string) {
    await fetch(`/api/tenant/tasks/${task.id}/subscribers/${userId}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleAddSubtask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const response = await fetch("/api/tenant/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSubtaskTitle, projectId, parentTaskId: task.id }),
    });
    if (response.ok) {
      setNewSubtaskTitle("");
      router.refresh();
    }
  }

  async function handleAddTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTodoTitle.trim()) return;
    await fetch(`/api/tenant/tasks/${task.id}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTodoTitle, assigneeId: newTodoAssigneeId === "__none__" ? undefined : newTodoAssigneeId }),
    });
    setNewTodoTitle("");
    setNewTodoAssigneeId("__none__");
    router.refresh();
  }

  async function handleToggleTodo(todoId: string, isDone: boolean) {
    await fetch(`/api/tenant/tasks/${task.id}/todos/${todoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone }),
    });
    router.refresh();
  }

  async function handleTodoAssigneeChange(todoId: string, assigneeId: string) {
    await fetch(`/api/tenant/tasks/${task.id}/todos/${todoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: assigneeId === "__none__" ? null : assigneeId }),
    });
    router.refresh();
  }

  async function handleDeleteTodo(todoId: string) {
    await fetch(`/api/tenant/tasks/${task.id}/todos/${todoId}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleRecurrenceFrequencyChange(value: string) {
    setRecurrenceFrequency(value as typeof recurrenceFrequency);
    if (value === "none") {
      await updateTask({ recurrence: null });
      return;
    }
    await updateTask({ recurrence: { frequency: value, interval: recurrenceInterval } });
  }

  async function handleRecurrenceIntervalChange(value: number) {
    const interval = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
    setRecurrenceInterval(interval);
    if (recurrenceFrequency === "none") return;
    await updateTask({ recurrence: { frequency: recurrenceFrequency, interval } });
  }

  async function handleCustomValueChange(fieldId: string, value: string) {
    setCustomValues((current) => ({ ...current, [fieldId]: value }));
    await fetch(`/api/tenant/tasks/${task.id}/custom-fields/${fieldId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    router.refresh();
  }

  async function handleRemoveDependency(dependencyId: string) {
    await fetch(`/api/tenant/tasks/${task.id}/dependencies/${dependencyId}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleAddTimeEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minutes = Number(timeMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    await fetch("/api/tenant/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, durationMinutes: minutes, description: timeDescription || undefined }),
    });
    setTimeMinutes("");
    setTimeDescription("");
    router.refresh();
  }

  const customFieldDefById = new Map(customFieldDefs.map((def) => [def.id, def]));

  const taskListLabel = taskLists.find((list) => list.id === task.taskListGroupId)?.label;
  const shortRef = `#T-${task.id.slice(0, 8).toUpperCase()}`;
  const isTimerRunningHere = runningTimerTaskId === task.id;

  return (
    <div className="mx-auto max-w-5xl pb-10">
      {/* Reference "Aktionsleiste" (§05 Task-Detail): Timer ▶, Beobachten, Link,
          Favorit, Vollbild, Schließen. "Sperren"/"…" omitted — no locking
          feature exists in this app, and there are no further bulk actions
          to hide behind a menu yet. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            {taskListLabel && (
              <>
                <BreadcrumbItem>{taskListLabel}</BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage className="font-mono text-xs">{shortRef}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={isTimerRunningHere ? "outlineDestructive" : "ghost"}
            size="sm"
            disabled={timerBusy}
            onClick={handleToggleTimer}
            title={isTimerRunningHere ? "Timer stoppen" : "Timer für diesen Task starten"}
          >
            {isTimerRunningHere ? <Square className="size-3.5 fill-current" /> : <Play className="size-4" />}
            {isTimerRunningHere ? "Stop" : "Timer"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleToggleWatch}
            aria-pressed={isWatching}
            title={isWatching ? "Nicht mehr beobachten" : "Beobachten"}
            className={isWatching ? "text-primary" : "text-muted-foreground"}
          >
            {isWatching ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleCopyLink}
            title={linkCopied ? "Link kopiert!" : "Link kopieren"}
            className="text-muted-foreground"
          >
            {linkCopied ? <Check className="size-4 text-success" /> : <Link2 className="size-4" />}
          </Button>
          <FavoriteButton entityType="task" entityId={task.id} initialFavorited={isFavorite} />
          <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" asChild>
            <a href={`/projects/${projectId}/tasks/${task.id}`} title="Vollbild öffnen">
              <Maximize2 className="size-4" />
            </a>
          </Button>
        </div>
      </div>

      {task.parentTask && (
        <p className="mb-2 text-xs text-muted-foreground">
          Subtask von{" "}
          <Link href={`/projects/${projectId}/tasks/${task.parentTask.id}`} className="hover:text-primary hover:underline">
            {task.parentTask.title}
          </Link>
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_300px]">
        {/* Main content — left column */}
        <div className="min-w-0">
          <h1 className="mb-3 text-2xl font-bold tracking-tight">{task.title}</h1>

          {/* Description */}
          {editingDescription ? (
            <div className="mb-5">
              <Textarea value={descriptionDraft} onChange={(event) => setDescriptionDraft(event.target.value)} className="min-h-24 w-full" autoFocus />
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={handleSaveDescription}>
                  Speichern
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDescriptionDraft(task.description ?? "");
                    setEditingDescription(false);
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            <div onClick={() => setEditingDescription(true)} className="mb-6 cursor-text">
              {task.description ? (
                <p className="text-sm text-muted-foreground">{task.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground/60">Beschreibung hinzufügen…</p>
              )}
            </div>
          )}

          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

          {/* Reference "Objekt-Subtabs": Attachments · Dependencies · Subtasks · To-dos */}
          <Tabs defaultValue="attachments" className="mb-8">
            <TabsList>
              <TabsTrigger value="attachments">
                Attachments{task.attachments.length > 0 ? ` (${task.attachments.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              <TabsTrigger value="links">Links{linkedTasks.length > 0 ? ` (${linkedTasks.length})` : ""}</TabsTrigger>
              <TabsTrigger value="subtasks">Subtasks{task.subtasks.length > 0 ? ` (${task.subtasks.length})` : ""}</TabsTrigger>
              <TabsTrigger value="todos">To-dos{task.todos.length > 0 ? ` (${task.todos.length})` : ""}</TabsTrigger>
            </TabsList>

            <TabsContent value="attachments" className="pt-4">
              {task.attachments.length > 0 && (
                <ul className="mb-3 flex flex-col gap-1.5">
                  {task.attachments.map((attachment) => (
                    <li key={attachment.id} className="flex items-center justify-between gap-3 text-sm">
                      <a href={`/api/tenant/attachments/${attachment.id}/download`} className="flex items-center gap-1.5 font-semibold hover:text-primary">
                        <Paperclip className="size-3.5 text-muted-foreground" />
                        {attachment.filename}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(attachment.sizeBytes / 1024)} KB · {attachment.uploadedBy}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <input type="file" onChange={handleFileUpload} disabled={uploading} className="text-sm" />
            </TabsContent>

            <TabsContent value="dependencies" className="flex flex-col gap-4 pt-4">
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Blockiert</p>
                {task.blocking.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {task.blocking.map((dep) => (
                      <li key={dep.dependencyId} className="flex items-center justify-between text-sm">
                        <Link href={`/projects/${projectId}/tasks/${dep.id}`} className="hover:text-primary hover:underline">
                          {dep.title}
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveDependency(dep.dependencyId)}>
                          Entfernen
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <DependencyAddControl taskId={task.id} ownId={task.id} mode="blocking" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Blockiert durch</p>
                {task.blockedBy.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {task.blockedBy.map((dep) => (
                      <li key={dep.dependencyId} className="flex items-center justify-between text-sm">
                        <Link href={`/projects/${projectId}/tasks/${dep.id}`} className="hover:text-primary hover:underline">
                          {dep.title}
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveDependency(dep.dependencyId)}>
                          Entfernen
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <DependencyAddControl taskId={task.id} ownId={task.id} mode="blockedBy" />
              </div>
            </TabsContent>

            <TabsContent value="links" className="pt-4">
              <TaskLinksPanel taskId={task.id} links={linkedTasks} className="" />
            </TabsContent>

            <TabsContent value="subtasks" className="pt-4">
              {task.subtasks.length > 0 && (
                <ul className="mb-3 flex flex-col gap-1">
                  {task.subtasks.map((sub) => (
                    <li key={sub.id} className="flex items-center justify-between gap-3 border-b py-1.5 text-sm last:border-0">
                      <Link href={`/projects/${projectId}/tasks/${sub.id}`} className="hover:text-primary hover:underline">
                        {sub.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {sub.statusName}
                        {sub.assigneeLabel ? ` · ${sub.assigneeLabel}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <Input placeholder="Neuer Subtask…" value={newSubtaskTitle} onChange={(event) => setNewSubtaskTitle(event.target.value)} className="flex-1" />
                <Button type="submit" variant="outline" size="sm">
                  Hinzufügen
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="todos" className="pt-4">
              {task.todos.length > 0 && (
                <ul className="mb-3 flex flex-col gap-1.5">
                  {task.todos.map((todo) => (
                    <li key={todo.id} className="flex items-center justify-between gap-2 text-sm">
                      <label className="flex items-center gap-2">
                        <Checkbox checked={todo.isDone} onCheckedChange={(checked) => handleToggleTodo(todo.id, checked === true)} />
                        <span className={todo.isDone ? "line-through" : ""}>{todo.title}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <Select defaultValue={todo.assigneeId ?? "__none__"} onValueChange={(value) => handleTodoAssigneeChange(todo.id, value)}>
                          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— niemand —</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTodo(todo.id)}>
                          Löschen
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleAddTodo} className="flex gap-2">
                <Input placeholder="Neues To-do…" value={newTodoTitle} onChange={(event) => setNewTodoTitle(event.target.value)} className="flex-1" />
                <Select value={newTodoAssigneeId} onValueChange={setNewTodoAssigneeId}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— niemand —</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" variant="outline" size="sm">
                  Hinzufügen
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Feed / Time tabs */}
          <Tabs defaultValue="feed" className="mt-8">
            <TabsList>
              <TabsTrigger value="feed">Feed</TabsTrigger>
              <TabsTrigger value="time">Time</TabsTrigger>
            </TabsList>

            <TabsContent value="feed">
              <ul className="mb-4 flex flex-col gap-3">
                {[
                  ...task.comments.map((c) => ({ kind: "comment" as const, id: c.id, createdAt: c.createdAt, comment: c })),
                  ...task.activityEvents.map((e) => ({ kind: "activity" as const, id: e.id, createdAt: e.createdAt, event: e })),
                ]
                  .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                  .map((entry) =>
                    entry.kind === "comment" ? (
                      <li key={`comment-${entry.id}`}>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm">{entry.comment.author}</strong>
                          <span className="text-xs text-muted-foreground">{new Date(entry.comment.createdAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}</span>
                        </div>
                        <div className="text-sm">{entry.comment.body}</div>
                      </li>
                    ) : (
                      <li key={`activity-${entry.id}`} className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{entry.event.actorLabel}</span> {entry.event.summary}
                        <span className="ml-2 text-xs">{new Date(entry.event.createdAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}</span>
                      </li>
                    ),
                  )}
                {task.comments.length === 0 && task.activityEvents.length === 0 && (
                  <li className="text-sm text-muted-foreground">Noch keine Aktivität.</li>
                )}
              </ul>
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <Textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Kommentar schreiben… @email erwähnt eine Person"
                  required
                  className="min-h-16 flex-1"
                />
                <Button type="submit">Senden</Button>
              </form>
            </TabsContent>

            <TabsContent value="time">
              {task.timeEntries.length === 0 ? (
                <p className="mb-4 text-sm text-muted-foreground">Noch keine Zeiteinträge.</p>
              ) : (
                <ul className="mb-4 flex flex-col gap-2">
                  {task.timeEntries.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between text-sm">
                      <span>
                        <strong>{entry.userLabel}</strong>
                        {entry.description ? ` — ${entry.description}` : ""}
                      </span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {formatMinutes(entry.durationMinutes)}
                        <span className="text-xs">{new Date(entry.createdAt).toLocaleDateString("de-DE")}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleAddTimeEntry} className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="Minuten"
                  value={timeMinutes}
                  onChange={(event) => setTimeMinutes(event.target.value)}
                  className="w-28"
                />
                <Input
                  placeholder="Beschreibung (optional)"
                  value={timeDescription}
                  onChange={(event) => setTimeDescription(event.target.value)}
                  className="flex-1"
                />
                <Button type="submit" variant="outline">
                  Buchen
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Metadata — right sidebar */}
        <Card className="sticky top-4">
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select defaultValue={task.statusId} onValueChange={(value) => updateTask({ statusId: value })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Liste</Label>
              <Select defaultValue={task.taskListGroupId ?? "__none__"} onValueChange={(value) => updateTask({ taskListGroupId: value === "__none__" ? null : value })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— keine —</SelectItem>
                  {taskLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Assignee</Label>
              <Select defaultValue={task.assigneeId ?? "__none__"} onValueChange={(value) => updateTask({ assigneeId: value === "__none__" ? null : value })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— niemand —</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Startdatum</Label>
              <Input type="date" defaultValue={toDateInputValue(task.startDate)} onChange={(event) => updateTask({ startDate: event.target.value || null })} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Fälligkeitsdatum</Label>
              <Input type="date" defaultValue={toDateInputValue(task.dueDate)} onChange={(event) => updateTask({ dueDate: event.target.value || null })} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Initial estimate (h)</Label>
              <Input
                type="number"
                step="0.5"
                defaultValue={task.estimatedHours ?? ""}
                onBlur={(event) => updateTask({ estimatedHours: event.target.value === "" ? null : Number(event.target.value) })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox defaultChecked={task.isKeyTask} onCheckedChange={(checked) => updateTask({ isKeyTask: checked === true })} />
                Key Task
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox defaultChecked={task.isPrivate} onCheckedChange={(checked) => updateTask({ isPrivate: checked === true })} />
                Privat
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox defaultChecked={task.isTemplate} onCheckedChange={(checked) => updateTask({ isTemplate: checked === true })} />
                Als Vorlage speichern
              </label>
            </div>

            {/* Wiederholung */}
            <div>
              <Label className="mb-2 block">Wiederholung</Label>
              <div className="flex gap-2">
                <Select value={recurrenceFrequency} onValueChange={handleRecurrenceFrequencyChange}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine</SelectItem>
                    <SelectItem value="daily">Täglich</SelectItem>
                    <SelectItem value="weekly">Wöchentlich</SelectItem>
                    <SelectItem value="monthly">Monatlich</SelectItem>
                    <SelectItem value="yearly">Jährlich</SelectItem>
                  </SelectContent>
                </Select>
                {recurrenceFrequency !== "none" && (
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={recurrenceInterval}
                    onChange={(event) => handleRecurrenceIntervalChange(Number(event.target.value))}
                    aria-label="Intervall"
                    className="w-20"
                  />
                )}
              </div>
              {task.recurrenceParent && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Erzeugt aus wiederkehrendem Task{" "}
                  <Link href={`/projects/${projectId}/tasks/${task.recurrenceParent.id}`} className="hover:text-primary hover:underline">
                    {task.recurrenceParent.title}
                  </Link>
                </p>
              )}
            </div>

            {/* Subscribers */}
            <div>
              <Label className="mb-2 block">Subscriber</Label>
              <ul className="mb-2 flex flex-col gap-1">
                {task.subscribers.map((subscriber) => (
                  <li key={subscriber.userId} className="flex items-center justify-between text-sm">
                    <span>{subscriber.label}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveSubscriber(subscriber.userId)}>
                      Entfernen
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Select value={subscribeUserId} onValueChange={setSubscribeUserId}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon-sm" onClick={handleAddSubscriber} aria-label="Subscriber hinzufügen">
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Tags</Label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="gap-1">
                    {tag.name}
                    <button type="button" onClick={() => handleRemoveTag(tag.id)} aria-label={`Tag ${tag.name} entfernen`}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <form onSubmit={handleAddTag} className="flex gap-2">
                <Input placeholder="Tag hinzufügen…" value={newTagName} onChange={(event) => setNewTagName(event.target.value)} className="flex-1" />
                <Button type="submit" variant="outline" size="icon-sm" aria-label="Tag hinzufügen">
                  <Plus className="size-4" />
                </Button>
              </form>
            </div>

            {task.customValues.length > 0 && (
              <div>
                <Label className="mb-2 block">Custom Fields</Label>
                <ul className="flex flex-col gap-3">
                  {task.customValues.map((value) => {
                    const def = customFieldDefById.get(value.fieldId);
                    return (
                      <li key={value.fieldId} className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">{value.label}</span>
                        {def ? (
                          <CustomFieldInput
                            id={`cf-${value.fieldId}`}
                            field={{ id: value.fieldId, label: value.label, type: def.type, options: def.options }}
                            value={customValues[value.fieldId] ?? ""}
                            onChange={(next) => handleCustomValueChange(value.fieldId, next)}
                            users={users}
                          />
                        ) : (
                          <CustomFieldValueDisplay type={value.type} value={value.value} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
