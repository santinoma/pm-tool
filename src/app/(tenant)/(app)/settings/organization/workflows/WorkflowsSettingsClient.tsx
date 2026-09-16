"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/shadcn/components/card";
import { Input } from "@/ui/shadcn/components/input";

interface StatusRow {
  id: string;
  name: string;
  category: string;
  position: number;
  isDefault: boolean;
}

interface WorkflowRow {
  id: string;
  name: string;
  archived: boolean;
  statuses: StatusRow[];
  projects: { id: string; name: string }[];
}

const CATEGORY_LABELS: Record<string, string> = { not_started: "Not started", started: "Started", done: "Closed" };

// Reference "Creating and Managing Workflows" §"Setting Up a New Workflow":
// three fixed stages, any number of statuses per stage.
const CATEGORY_ORDER = ["not_started", "started", "done"];

export function WorkflowsSettingsClient({ canManage, workflows }: { canManage: boolean; workflows: WorkflowRow[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCount = workflows.filter((w) => !w.archived).length;

  async function handleCreateWorkflow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newWorkflowName.trim()) return;
    setCreating(true);
    setError(null);
    const response = await fetch("/api/tenant/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newWorkflowName }),
    });
    setCreating(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Workflow konnte nicht angelegt werden.");
      return;
    }
    setNewWorkflowName("");
    router.refresh();
  }

  async function handleToggleArchived(workflow: WorkflowRow) {
    await fetch(`/api/tenant/workflows/${workflow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !workflow.archived }),
    });
    router.refresh();
  }

  async function handleAddStatus(workflowId: string, name: string, category: string) {
    if (!name.trim()) return;
    const response = await fetch(`/api/tenant/workflows/${workflowId}/statuses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category }),
    });
    if (response.ok) router.refresh();
  }

  async function handleDeleteStatus(workflowId: string, statusId: string) {
    const response = await fetch(`/api/tenant/workflows/${workflowId}/statuses/${statusId}`, { method: "DELETE" });
    if (response.ok) {
      router.refresh();
    } else {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Status konnte nicht gelöscht werden.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
        <span className="font-mono text-xs text-muted-foreground">{activeCount} Workflow(s)</span>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Ein Workflow ist ein wiederverwendbarer Satz Task-Status. Mehrere Projekte können denselben Workflow nutzen —
        Änderungen an einem Workflow wirken sich auf alle Projekte aus, die ihn verwenden.
      </p>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {canManage && (
        <form onSubmit={handleCreateWorkflow} className="mb-6 flex gap-2">
          <Input
            value={newWorkflowName}
            onChange={(event) => setNewWorkflowName(event.target.value)}
            placeholder="Name des neuen Workflows"
            className="max-w-xs"
          />
          <Button type="submit" disabled={creating || !newWorkflowName.trim()}>
            Add workflow
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {workflows.map((workflow) => {
          const isExpanded = expandedId === workflow.id;
          return (
            <Card key={workflow.id}>
              <CardHeader
                className="cursor-pointer flex-row items-center justify-between gap-2 space-y-0"
                onClick={() => setExpandedId(isExpanded ? null : workflow.id)}
              >
                <CardTitle className="flex items-center gap-2 text-sm">
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  {workflow.name}
                  {workflow.archived && <Badge variant="outline">Archiviert</Badge>}
                  <span className="font-normal text-muted-foreground">
                    {workflow.statuses.length} Status(e) · {workflow.projects.length} Projekt(e)
                  </span>
                </CardTitle>
                {canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleToggleArchived(workflow);
                    }}
                  >
                    {workflow.archived ? "Reaktivieren" : "Archive"}
                  </Button>
                )}
              </CardHeader>
              {isExpanded && (
                <CardContent className="flex flex-col gap-4">
                  {workflow.projects.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Verwendet von: {workflow.projects.map((p) => p.name).join(", ")}
                    </p>
                  )}
                  {CATEGORY_ORDER.map((category) => (
                    <div key={category} className="flex flex-col gap-2">
                      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {CATEGORY_LABELS[category]}
                      </span>
                      <ul className="flex flex-col gap-1">
                        {workflow.statuses
                          .filter((status) => status.category === category)
                          .map((status) => (
                            <li key={status.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                              <span>
                                {status.name}
                                {status.isDefault && <span className="ml-1 text-xs text-muted-foreground">(Default)</span>}
                              </span>
                              {canManage && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteStatus(workflow.id, status.id)}
                                >
                                  Entfernen
                                </Button>
                              )}
                            </li>
                          ))}
                      </ul>
                      {canManage && (
                        <NewStatusRow
                          onAdd={(name) => handleAddStatus(workflow.id, name, category)}
                        />
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function NewStatusRow({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        onAdd(name);
        setName("");
      }}
      className="flex gap-2"
    >
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Neuer Status…" className="h-8 max-w-48 text-sm" />
      <Button type="submit" size="sm" variant="outline" disabled={!name.trim()}>
        Hinzufügen
      </Button>
    </form>
  );
}
