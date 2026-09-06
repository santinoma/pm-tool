"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

type Trigger = "task_created" | "task_status_changed" | "task_updated" | "task_commented" | "time_daily" | "time_weekly";
// send_email ist bewusst nicht in der UI wählbar — diese Codebase hat keine
// echte E-Mail-Versandinfrastruktur, die Aktion wäre nur ein No-Op (siehe
// runAutomations.ts). Sie bleibt im Schema/Backend für Forward-Kompatibilität.
type ActionType =
  | "assign_user"
  | "notify_user"
  | "change_status"
  | "add_comment"
  | "create_task"
  | "create_subtask"
  | "create_todo";
type StatusCategory = "not_started" | "started" | "done";

const NEW_ITEM_ACTION_TYPES: ActionType[] = ["create_task", "create_subtask", "create_todo"];

interface RuleAction {
  type: ActionType;
  targetUserLabel: string | null;
  targetStatusLabel: string | null;
  commentBody: string | null;
  newItemTitle?: string | null;
}

interface Rule {
  id: string;
  name: string;
  triggers: Trigger[];
  conditionStatusCategory: StatusCategory | null;
  scheduleTime: string | null;
  scheduleWeekday: number | null;
  isEnabled: boolean;
  projectIds: string[];
  actions: RuleAction[];
}

interface UserOption {
  id: string;
  label: string;
}

interface StatusOption {
  id: string;
  label: string;
}

interface ProjectOption {
  id: string;
  label: string;
}

const TRIGGER_LABELS: Record<Trigger, string> = {
  task_created: "Task erstellt",
  task_status_changed: "Task-Status geändert",
  task_updated: "Task aktualisiert",
  task_commented: "Kommentar hinzugefügt",
  time_daily: "Zeitplan: täglich",
  time_weekly: "Zeitplan: wöchentlich",
};

const ACTION_LABELS: Record<ActionType, string> = {
  assign_user: "Zuweisen an",
  notify_user: "Benachrichtigen",
  change_status: "Status ändern zu",
  add_comment: "Kommentar hinzufügen",
  create_task: "Task erstellen",
  create_subtask: "Subtask erstellen",
  create_todo: "Todo erstellen",
};

const CATEGORY_LABELS: Record<StatusCategory, string> = {
  not_started: "Nicht begonnen",
  started: "In Arbeit",
  done: "Erledigt",
};

const WEEKDAY_LABELS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

interface DraftAction {
  type: ActionType;
  targetUserId: string;
  targetStatusId: string;
  commentBody: string;
  newItemTitle: string;
}

interface Recipe {
  key: string;
  title: string;
  description: string;
  name: string;
  triggers: Trigger[];
  conditionCategory: StatusCategory | "__any__";
  scheduleTime?: string;
  scheduleWeekday?: number;
  actions: Array<Pick<DraftAction, "type"> & Partial<DraftAction>>;
}

const RECIPES: Recipe[] = [
  {
    key: "notify-on-create",
    title: "Neuer Task → benachrichtigen",
    description: "Wenn ein Task erstellt wird, eine Person benachrichtigen.",
    name: "Neuer Task → Benachrichtigung",
    triggers: ["task_created"],
    conditionCategory: "__any__",
    actions: [{ type: "notify_user" }],
  },
  {
    key: "notify-on-done",
    title: "Als erledigt markiert → benachrichtigen",
    description: "Wenn ein Task in die Kategorie „Erledigt“ wechselt, eine Person benachrichtigen.",
    name: "Task erledigt → Benachrichtigung",
    triggers: ["task_status_changed"],
    conditionCategory: "done",
    actions: [{ type: "notify_user" }],
  },
  {
    key: "notify-on-comment",
    title: "Neuer Kommentar → benachrichtigen",
    description: "Wenn ein Kommentar hinzugefügt wird, den Verantwortlichen benachrichtigen.",
    name: "Kommentar → Benachrichtigung",
    triggers: ["task_commented"],
    conditionCategory: "__any__",
    actions: [{ type: "notify_user" }],
  },
  {
    key: "auto-progress-status",
    title: "Task aktualisiert → Status setzen",
    description: "Wenn sich ein Task ändert, automatisch in einen bestimmten Status verschieben.",
    name: "Auto-Status bei Änderung",
    triggers: ["task_updated"],
    conditionCategory: "__any__",
    actions: [{ type: "change_status" }],
  },
  {
    key: "daily-todo",
    title: "Täglich → Todo erstellen",
    description: "Jeden Tag um 9 Uhr automatisch ein wiederkehrendes Todo anlegen.",
    name: "Tägliches Todo",
    triggers: ["time_daily"],
    conditionCategory: "__any__",
    scheduleTime: "09:00",
    actions: [{ type: "create_todo", newItemTitle: "Tages-Check-in" }],
  },
  {
    key: "weekly-review-task",
    title: "Wöchentlich → Review-Task erstellen",
    description: "Jeden Montag automatisch einen Wochenreview-Task anlegen.",
    name: "Wöchentlicher Review-Task",
    triggers: ["time_weekly"],
    conditionCategory: "__any__",
    scheduleTime: "09:00",
    scheduleWeekday: 1,
    actions: [{ type: "create_task", newItemTitle: "Wochenreview" }],
  },
];

export function AutomationsClient({
  canManage,
  users,
  statuses,
  projects,
  rules,
}: {
  canManage: boolean;
  users: UserOption[];
  statuses: StatusOption[];
  projects: ProjectOption[];
  rules: Rule[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [triggers, setTriggers] = useState<Trigger[]>(["task_created"]);
  const [conditionCategory, setConditionCategory] = useState<StatusCategory | "__any__">("__any__");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleWeekday, setScheduleWeekday] = useState(1);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [draftActions, setDraftActions] = useState<DraftAction[]>([
    {
      type: "assign_user",
      targetUserId: users[0]?.id ?? "",
      targetStatusId: statuses[0]?.id ?? "",
      commentBody: "",
      newItemTitle: "",
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [runNowTaskId, setRunNowTaskId] = useState<Record<string, string>>({});

  function toggleProject(projectId: string) {
    setProjectIds((current) =>
      current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId],
    );
  }

  const hasTimeTrigger = triggers.includes("time_daily") || triggers.includes("time_weekly");

  function toggleTrigger(t: Trigger) {
    setTriggers((current) => (current.includes(t) ? current.filter((x) => x !== t) : [...current, t]));
  }

  function applyRecipe(recipe: Recipe) {
    setName(recipe.name);
    setTriggers(recipe.triggers);
    setConditionCategory(recipe.conditionCategory);
    if (recipe.scheduleTime) setScheduleTime(recipe.scheduleTime);
    if (recipe.scheduleWeekday !== undefined) setScheduleWeekday(recipe.scheduleWeekday);
    setDraftActions(
      recipe.actions.map((action) => ({
        type: action.type,
        targetUserId: action.targetUserId ?? users[0]?.id ?? "",
        targetStatusId: action.targetStatusId ?? statuses[0]?.id ?? "",
        commentBody: action.commentBody ?? "",
        newItemTitle: action.newItemTitle ?? "",
      })),
    );
  }

  function addDraftAction() {
    setDraftActions((current) => [
      ...current,
      {
        type: "assign_user",
        targetUserId: users[0]?.id ?? "",
        targetStatusId: statuses[0]?.id ?? "",
        commentBody: "",
        newItemTitle: "",
      },
    ]);
  }

  function removeDraftAction(index: number) {
    setDraftActions((current) => current.filter((_, i) => i !== index));
  }

  function updateDraftAction(index: number, changes: Partial<DraftAction>) {
    setDraftActions((current) => current.map((action, i) => (i === index ? { ...action, ...changes } : action)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (triggers.length === 0) {
      setError("Mindestens ein Trigger ist erforderlich.");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/tenant/automation-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        triggers,
        conditionStatusCategory:
          triggers.includes("task_status_changed") && conditionCategory !== "__any__" ? conditionCategory : null,
        scheduleTime: hasTimeTrigger ? scheduleTime : undefined,
        scheduleWeekday: triggers.includes("time_weekly") ? scheduleWeekday : undefined,
        projectIds,
        actions: draftActions.map((action) => ({
          type: action.type,
          targetUserId:
            action.type === "assign_user" || action.type === "notify_user" || NEW_ITEM_ACTION_TYPES.includes(action.type)
              ? action.targetUserId
              : undefined,
          targetStatusId: action.type === "change_status" ? action.targetStatusId : undefined,
          commentBody: action.type === "add_comment" ? action.commentBody : undefined,
          newItemTitle: NEW_ITEM_ACTION_TYPES.includes(action.type) ? action.newItemTitle : undefined,
        })),
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Automation konnte nicht angelegt werden.");
      return;
    }
    setName("");
    setTriggers(["task_created"]);
    setProjectIds([]);
    setDraftActions([
      {
        type: "assign_user",
        targetUserId: users[0]?.id ?? "",
        targetStatusId: statuses[0]?.id ?? "",
        commentBody: "",
        newItemTitle: "",
      },
    ]);
    router.refresh();
  }

  async function handleToggle(id: string, isEnabled: boolean) {
    await fetch(`/api/tenant/automation-rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled }),
    });
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tenant/automation-rules/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleRunNow(ruleId: string) {
    const taskId = runNowTaskId[ruleId];
    if (!taskId) return;
    const response = await fetch(`/api/tenant/automation-rules/${ruleId}/run-now`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Run Now fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Automations</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Erstelle Automationen, um Updates auszulösen, Benachrichtigungen zu senden oder Arbeit basierend auf
        Bedingungen zuzuweisen.
      </p>

      {canManage && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Vorlagen</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Vorlage wählen, um das Formular unten vorauszufüllen — Ziel-Person/Status danach anpassen und speichern.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RECIPES.map((recipe) => (
              <button
                key={recipe.key}
                type="button"
                onClick={() => applyRecipe(recipe)}
                className="rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <div className="text-sm font-semibold">{recipe.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{recipe.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {canManage && (
        <Card className="mb-8">
          <CardContent>
            <form onSubmit={handleSubmit}>
              <h2 className="mb-4 text-lg font-semibold">Neue Automation</h2>

              <div className="mb-4">
                <Label htmlFor="automation-name" className="mb-2 block">
                  Name
                </Label>
                <Input id="automation-name" value={name} onChange={(event) => setName(event.target.value)} required className="max-w-sm" />
              </div>

              <span className="mb-2 block text-sm font-medium">Wenn (mehrere wählbar)</span>
              <div className="mb-4 flex flex-col gap-1.5">
                {(Object.keys(TRIGGER_LABELS) as Trigger[]).map((t) => (
                  <Label key={t} className="flex items-center gap-2 font-normal">
                    <Checkbox checked={triggers.includes(t)} onCheckedChange={() => toggleTrigger(t)} />
                    {TRIGGER_LABELS[t]}
                  </Label>
                ))}
              </div>

              {triggers.includes("task_status_changed") && (
                <div className="mb-4 max-w-xs">
                  <Label htmlFor="automation-condition" className="mb-2 block">
                    Nur wenn neue Status-Kategorie
                  </Label>
                  <Select value={conditionCategory} onValueChange={(value) => setConditionCategory(value as StatusCategory | "__any__")}>
                    <SelectTrigger id="automation-condition" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Beliebig</SelectItem>
                      <SelectItem value="not_started">Nicht begonnen</SelectItem>
                      <SelectItem value="started">In Arbeit</SelectItem>
                      <SelectItem value="done">Erledigt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="mb-4">
                <span className="mb-2 block text-sm font-medium">Projekte (keine Auswahl = Alle Projekte)</span>
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Projekte vorhanden.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {projects.map((project) => (
                      <Label key={project.id} className="flex items-center gap-2 font-normal">
                        <Checkbox checked={projectIds.includes(project.id)} onCheckedChange={() => toggleProject(project.id)} />
                        {project.label}
                      </Label>
                    ))}
                  </div>
                )}
              </div>

              {hasTimeTrigger && (
                <div className="mb-4 flex gap-3">
                  <div>
                    <Label htmlFor="automation-schedule-time" className="mb-2 block">
                      Uhrzeit
                    </Label>
                    <Input
                      id="automation-schedule-time"
                      type="time"
                      value={scheduleTime}
                      onChange={(event) => setScheduleTime(event.target.value)}
                      className="w-32"
                    />
                  </div>
                  {triggers.includes("time_weekly") && (
                    <div>
                      <Label htmlFor="automation-schedule-weekday" className="mb-2 block">
                        Wochentag
                      </Label>
                      <Select value={String(scheduleWeekday)} onValueChange={(value) => setScheduleWeekday(Number(value))}>
                        <SelectTrigger id="automation-schedule-weekday" className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAY_LABELS.map((label, index) => (
                            <SelectItem key={label} value={String(index)}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <span className="mb-2 block text-sm font-medium">Dann</span>
              <div className="mb-3 flex flex-col gap-2">
                {draftActions.map((action, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <Select value={action.type} onValueChange={(value) => updateDraftAction(index, { type: value as ActionType })}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assign_user">Zuweisen an</SelectItem>
                        <SelectItem value="notify_user">Benachrichtigen</SelectItem>
                        <SelectItem value="change_status">Status ändern zu</SelectItem>
                        <SelectItem value="add_comment">Kommentar hinzufügen</SelectItem>
                        <SelectItem value="create_task">Task erstellen</SelectItem>
                        <SelectItem value="create_subtask">Subtask erstellen</SelectItem>
                        <SelectItem value="create_todo">Todo erstellen</SelectItem>
                      </SelectContent>
                    </Select>
                    {(action.type === "assign_user" || action.type === "notify_user") && (
                      <Select value={action.targetUserId} onValueChange={(value) => updateDraftAction(index, { targetUserId: value })}>
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {action.type === "change_status" && (
                      <Select value={action.targetStatusId} onValueChange={(value) => updateDraftAction(index, { targetStatusId: value })}>
                        <SelectTrigger className="w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {action.type === "add_comment" && (
                      <Input
                        placeholder="Kommentartext"
                        value={action.commentBody}
                        onChange={(event) => updateDraftAction(index, { commentBody: event.target.value })}
                        className="w-56"
                      />
                    )}
                    {NEW_ITEM_ACTION_TYPES.includes(action.type) && (
                      <>
                        <Input
                          placeholder="Titel des neuen Eintrags"
                          value={action.newItemTitle}
                          onChange={(event) => updateDraftAction(index, { newItemTitle: event.target.value })}
                          className="w-56"
                        />
                        <Select
                          value={action.targetUserId || "__unassign__"}
                          onValueChange={(value) => updateDraftAction(index, { targetUserId: value === "__unassign__" ? "" : value })}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassign__">Nicht zugewiesen</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeDraftAction(index)}>
                      Entfernen
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addDraftAction} className="mb-4">
                + Aktion hinzufügen
              </Button>

              {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

              <div>
                <Button type="submit" disabled={saving}>
                  Automation anlegen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-3 text-lg font-semibold">Bestehende Automationen</h2>
      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Automationen angelegt.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent>
                <div className="mb-2 flex items-center justify-between">
                  <strong className="text-sm">{rule.name}</strong>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Label className="flex items-center gap-2 font-normal">
                        <Checkbox checked={rule.isEnabled} onCheckedChange={(value) => handleToggle(rule.id, value === true)} />
                        Aktiv
                      </Label>
                      <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(rule.id)}>
                        Löschen
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Wenn <strong className="text-foreground">{rule.triggers.map((t) => TRIGGER_LABELS[t]).join(" oder ")}</strong>
                  {rule.conditionStatusCategory && <> (nur bei Kategorie „{CATEGORY_LABELS[rule.conditionStatusCategory]}“)</>}
                  {rule.scheduleTime && <> um {rule.scheduleTime} Uhr</>}
                  {rule.scheduleWeekday !== null && <> ({WEEKDAY_LABELS[rule.scheduleWeekday]})</>}
                  {" — "}
                  {rule.projectIds.length === 0
                    ? "Alle Projekte"
                    : `${rule.projectIds.length} Projekt${rule.projectIds.length === 1 ? "" : "e"}`}
                  , dann:{" "}
                  {rule.actions
                    .map((action) =>
                      action.type === "add_comment"
                        ? `${ACTION_LABELS[action.type]} "${action.commentBody}"`
                        : NEW_ITEM_ACTION_TYPES.includes(action.type)
                          ? `${ACTION_LABELS[action.type]} "${action.newItemTitle ?? ""}"${action.targetUserLabel ? ` (${action.targetUserLabel})` : ""}`
                          : `${ACTION_LABELS[action.type]} ${action.targetUserLabel ?? action.targetStatusLabel ?? ""}`,
                    )
                    .join(", ")}
                </p>
                {canManage && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      placeholder="Task-ID für Run Now"
                      value={runNowTaskId[rule.id] ?? ""}
                      onChange={(event) => setRunNowTaskId((current) => ({ ...current, [rule.id]: event.target.value }))}
                      className="max-w-64"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => handleRunNow(rule.id)}>
                      Run Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
