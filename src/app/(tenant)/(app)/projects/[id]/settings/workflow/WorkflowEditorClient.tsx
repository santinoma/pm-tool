"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Star } from "lucide-react";

import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

interface StatusRow {
  id: string;
  name: string;
  category: string;
  position: number;
  isDefault: boolean;
}

interface CustomFieldRow {
  id: string;
  label: string;
}

interface TransitionRuleRow {
  id: string;
  fromStatusName: string | null;
  toStatusName: string;
  requiredFieldKeys: string[];
}

const BUILT_IN_FIELD_OPTIONS = [
  { key: "assignee", label: "Zuständige Person" },
  { key: "dueDate", label: "Fälligkeitsdatum" },
  { key: "estimatedHours", label: "Geschätzte Stunden" },
];

const CATEGORY_GROUPS: { value: string; label: string; dotClass: string }[] = [
  { value: "not_started", label: "Nicht begonnen", dotClass: "bg-muted-foreground" },
  { value: "started", label: "Gestartet", dotClass: "bg-primary" },
  { value: "done", label: "Abgeschlossen", dotClass: "bg-success" },
];

export function WorkflowEditorClient({
  projectId,
  canManage,
  statuses,
  customFields,
  transitionRules,
  workflowName,
  sharedProjectCount,
}: {
  projectId: string;
  canManage: boolean;
  statuses: StatusRow[];
  customFields: CustomFieldRow[];
  transitionRules: TransitionRuleRow[];
  workflowName: string;
  sharedProjectCount: number;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("not_started");
  const [error, setError] = useState<string | null>(null);

  const [ruleFromStatusId, setRuleFromStatusId] = useState("__any__");
  const [ruleToStatusId, setRuleToStatusId] = useState(statuses[0]?.id ?? "");
  const [ruleFieldKeys, setRuleFieldKeys] = useState<string[]>([]);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);

  const fieldLabel = (key: string) =>
    BUILT_IN_FIELD_OPTIONS.find((option) => option.key === key)?.label ??
    customFields.find((field) => `custom:${field.id}` === key)?.label ??
    key;

  function toggleFieldKey(key: string) {
    setRuleFieldKeys((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  async function handleAddRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRuleError(null);
    if (ruleFieldKeys.length === 0) {
      setRuleError("Mindestens ein Pflichtfeld auswählen.");
      return;
    }
    setRuleSaving(true);
    const response = await fetch(`/api/tenant/projects/${projectId}/transition-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromStatusId: ruleFromStatusId === "__any__" ? null : ruleFromStatusId,
        toStatusId: ruleToStatusId,
        requiredFieldKeys: ruleFieldKeys,
      }),
    });
    setRuleSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setRuleError(body.error ?? "Regel konnte nicht angelegt werden.");
      return;
    }
    setRuleFieldKeys([]);
    router.refresh();
  }

  async function handleDeleteRule(ruleId: string) {
    await fetch(`/api/tenant/projects/${projectId}/transition-rules/${ruleId}`, { method: "DELETE" });
    router.refresh();
  }

  async function patchStatus(statusId: string, data: Record<string, unknown>) {
    setError(null);
    const response = await fetch(`/api/tenant/projects/${projectId}/statuses/${statusId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Änderung fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function deleteStatus(statusId: string) {
    setError(null);
    const response = await fetch(`/api/tenant/projects/${projectId}/statuses/${statusId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Löschen fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function moveStatus(index: number, direction: -1 | 1) {
    const target = statuses[index + direction];
    const current = statuses[index];
    if (!target) return;
    await patchStatus(current.id, { position: target.position });
    await patchStatus(target.id, { position: current.position });
  }

  async function handleAddStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/tenant/projects/${projectId}/statuses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, category: newCategory }),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Status konnte nicht angelegt werden.");
      return;
    }
    setNewName("");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Status-Workflow</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {/* Reference "Creating and Managing Workflows": "Moving workflow statuses ...
            will immediately affect all tasks in projects that use this workflow." */}
        {sharedProjectCount > 1
          ? `„${workflowName}“ — geteilt mit ${sharedProjectCount - 1} weiteren Projekt(en). Änderungen hier wirken sich auf alle an.`
          : `„${workflowName}“ — nur von diesem Projekt verwendet.`}{" "}
        <a href="/settings/organization/workflows" className="underline hover:text-foreground">
          Alle Workflows verwalten
        </a>
      </p>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="mb-8 flex flex-col gap-5">
        {CATEGORY_GROUPS.map((group) => {
          const groupStatuses = statuses.filter((status) => status.category === group.value);
          return (
            <Card key={group.value}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className={`size-2 rounded-full ${group.dotClass}`} />
                  {group.label}
                  <span className="font-normal text-muted-foreground">{groupStatuses.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {groupStatuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Status in dieser Kategorie.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {groupStatuses.map((status) => {
                      const index = statuses.findIndex((candidate) => candidate.id === status.id);
                      return (
                        <li key={status.id} className="flex items-center gap-2">
                          <div className="flex flex-1 items-center gap-2">
                            <Button variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => moveStatus(index, -1)} aria-label="Nach oben">
                              <ChevronUp className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" disabled={index === statuses.length - 1} onClick={() => moveStatus(index, 1)} aria-label="Nach unten">
                              <ChevronDown className="size-3.5" />
                            </Button>
                            <Input
                              defaultValue={status.name}
                              onBlur={(event) => event.target.value !== status.name && patchStatus(status.id, { name: event.target.value })}
                              className="h-8 w-40"
                            />
                            <Select defaultValue={status.category} onValueChange={(value) => patchStatus(status.id, { category: value })}>
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">not_started</SelectItem>
                                <SelectItem value="started">started</SelectItem>
                                <SelectItem value="done">done</SelectItem>
                              </SelectContent>
                            </Select>
                            {status.isDefault && <Star className="size-4 fill-primary text-primary" aria-label="Default-Status für neue Tasks" />}
                          </div>
                          <Button variant="destructiveSubtle" size="sm" onClick={() => deleteStatus(status.id)}>
                            Löschen
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Neuer Status</h2>
      <form onSubmit={handleAddStatus} className="flex gap-2">
        <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Name" required className="flex-1" />
        <Select value={newCategory} onValueChange={setNewCategory}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">not_started</SelectItem>
            <SelectItem value="started">started</SelectItem>
            <SelectItem value="done">done</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Hinzufügen</Button>
      </form>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Übergangsregeln</h2>
      <p className="mb-4 text-sm text-muted-foreground">Lege Pflichtfelder fest, die beim Wechsel in einen Status gesetzt sein müssen.</p>

      {transitionRules.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Noch keine Übergangsregeln.</p>
      ) : (
        <ul className="mb-6 flex flex-col gap-1">
          {transitionRules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
              <span>
                {rule.fromStatusName ?? "Beliebig"} → {rule.toStatusName}: {rule.requiredFieldKeys.map(fieldLabel).join(", ")}
              </span>
              {canManage && (
                <Button variant="destructiveSubtle" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                  Löschen
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <Card>
          <CardContent>
            <form onSubmit={handleAddRule}>
              <h3 className="mb-4 text-base font-semibold">Neue Übergangsregel</h3>
              <div className="mb-4 flex flex-wrap gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="rule-from">Von</Label>
                  <Select value={ruleFromStatusId} onValueChange={setRuleFromStatusId}>
                    <SelectTrigger id="rule-from" className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Beliebig</SelectItem>
                      {statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="rule-to">Nach</Label>
                  <Select value={ruleToStatusId} onValueChange={setRuleToStatusId}>
                    <SelectTrigger id="rule-to" className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Label className="mb-2 block">Pflichtfelder</Label>
              <div className="mb-4 flex flex-col gap-1.5">
                {BUILT_IN_FIELD_OPTIONS.map((option) => (
                  <label key={option.key} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={ruleFieldKeys.includes(option.key)} onCheckedChange={() => toggleFieldKey(option.key)} />
                    {option.label}
                  </label>
                ))}
                {customFields.map((field) => (
                  <label key={field.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={ruleFieldKeys.includes(`custom:${field.id}`)} onCheckedChange={() => toggleFieldKey(`custom:${field.id}`)} />
                    {field.label}
                  </label>
                ))}
              </div>

              {ruleError && <p className="mb-3 text-sm text-destructive">{ruleError}</p>}

              <Button type="submit" loading={ruleSaving}>
                Regel anlegen
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
