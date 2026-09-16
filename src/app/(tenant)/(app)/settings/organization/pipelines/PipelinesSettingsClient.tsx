"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";

interface StatusRow {
  id: string;
  name: string;
  category: string;
  position: number;
  defaultProbability: number | null;
  trackTime: boolean;
  trackExpenses: boolean;
  createBookings: boolean;
  dealCount: number;
}

interface PipelineRow {
  id: string;
  name: string;
  archived: boolean;
  statuses: StatusRow[];
}

interface LostReasonRow {
  id: string;
  label: string;
  archived: boolean;
}

const CATEGORY_LABELS: Record<string, string> = { open: "Open", won: "Won", lost: "Lost" };
const CATEGORY_ORDER = ["open", "won", "lost"];

export function PipelinesSettingsClient({
  canManage,
  pipelines,
  lostReasons,
}: {
  canManage: boolean;
  pipelines: PipelineRow[];
  lostReasons: LostReasonRow[];
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newLostReasonLabel, setNewLostReasonLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreatePipeline(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newPipelineName.trim()) return;
    setError(null);
    const response = await fetch("/api/tenant/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPipelineName }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Pipeline konnte nicht angelegt werden.");
      return;
    }
    setNewPipelineName("");
    router.refresh();
  }

  async function handleToggleArchived(pipeline: PipelineRow) {
    await fetch(`/api/tenant/pipelines/${pipeline.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !pipeline.archived }),
    });
    router.refresh();
  }

  async function handleAddStatus(pipelineId: string, name: string, category: string) {
    if (!name.trim()) return;
    const response = await fetch(`/api/tenant/pipelines/${pipelineId}/statuses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category }),
    });
    if (response.ok) router.refresh();
  }

  async function handleUpdateStatus(pipelineId: string, statusId: string, fields: Record<string, unknown>) {
    await fetch(`/api/tenant/pipelines/${pipelineId}/statuses/${statusId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    router.refresh();
  }

  async function handleDeleteStatus(pipelineId: string, statusId: string) {
    const response = await fetch(`/api/tenant/pipelines/${pipelineId}/statuses/${statusId}`, { method: "DELETE" });
    if (response.ok) {
      router.refresh();
    } else {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Status konnte nicht gelöscht werden.");
    }
  }

  async function handleCreateLostReason(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newLostReasonLabel.trim()) return;
    setError(null);
    const response = await fetch("/api/tenant/lost-reasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLostReasonLabel }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Lost Reason konnte nicht angelegt werden.");
      return;
    }
    setNewLostReasonLabel("");
    router.refresh();
  }

  async function handleToggleLostReasonArchived(reason: LostReasonRow) {
    await fetch(`/api/tenant/lost-reasons/${reason.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !reason.archived }),
    });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Pipelines</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Eine Pipeline ist ein wiederverwendbarer Satz Deal-Stages. Jede Stage entscheidet, ob Zeit/Ausgaben getrackt und
        Bookings erstellt werden können.
      </p>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {canManage && (
        <form onSubmit={handleCreatePipeline} className="mb-6 flex gap-2">
          <Input
            value={newPipelineName}
            onChange={(event) => setNewPipelineName(event.target.value)}
            placeholder="Name der neuen Pipeline"
            className="max-w-xs"
          />
          <Button type="submit" disabled={!newPipelineName.trim()}>
            Add Pipeline
          </Button>
        </form>
      )}

      <div className="mb-10 flex flex-col gap-3">
        {pipelines.map((pipeline) => {
          const isExpanded = expandedId === pipeline.id;
          const totalDeals = pipeline.statuses.reduce((sum, s) => sum + s.dealCount, 0);
          return (
            <Card key={pipeline.id}>
              <CardHeader
                className="cursor-pointer flex-row items-center justify-between gap-2 space-y-0"
                onClick={() => setExpandedId(isExpanded ? null : pipeline.id)}
              >
                <CardTitle className="flex items-center gap-2 text-sm">
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  {pipeline.name}
                  {pipeline.archived && <Badge variant="outline">Archiviert</Badge>}
                  <span className="font-normal text-muted-foreground">
                    {pipeline.statuses.length} Stage(s) · {totalDeals} Deal(s)
                  </span>
                </CardTitle>
                {canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleToggleArchived(pipeline);
                    }}
                  >
                    {pipeline.archived ? "Reaktivieren" : "Archive"}
                  </Button>
                )}
              </CardHeader>
              {isExpanded && (
                <CardContent className="flex flex-col gap-4">
                  {CATEGORY_ORDER.map((category) => (
                    <div key={category} className="flex flex-col gap-2">
                      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {CATEGORY_LABELS[category]}
                      </span>
                      <ul className="flex flex-col gap-2">
                        {pipeline.statuses
                          .filter((status) => status.category === category)
                          .map((status) => (
                            <li key={status.id} className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{status.name}</span>
                                {canManage && (
                                  <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteStatus(pipeline.id, status.id)}>
                                    Entfernen
                                  </Button>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                <label className="flex items-center gap-1.5">
                                  <Checkbox
                                    checked={status.trackTime}
                                    disabled={!canManage}
                                    onCheckedChange={(checked) => handleUpdateStatus(pipeline.id, status.id, { trackTime: checked === true })}
                                  />
                                  Track Time
                                </label>
                                <label className="flex items-center gap-1.5">
                                  <Checkbox
                                    checked={status.trackExpenses}
                                    disabled={!canManage}
                                    onCheckedChange={(checked) => handleUpdateStatus(pipeline.id, status.id, { trackExpenses: checked === true })}
                                  />
                                  Track Expenses
                                </label>
                                <label className="flex items-center gap-1.5">
                                  <Checkbox
                                    checked={status.createBookings}
                                    disabled={!canManage}
                                    onCheckedChange={(checked) => handleUpdateStatus(pipeline.id, status.id, { createBookings: checked === true })}
                                  />
                                  Create Bookings
                                </label>
                                <span className="flex items-center gap-1.5">
                                  Default Probability:{" "}
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    disabled={!canManage}
                                    defaultValue={status.defaultProbability ?? ""}
                                    onBlur={(event) =>
                                      handleUpdateStatus(pipeline.id, status.id, {
                                        defaultProbability: event.target.value === "" ? null : Number(event.target.value),
                                      })
                                    }
                                    className="h-7 w-16"
                                  />
                                  %
                                </span>
                              </div>
                            </li>
                          ))}
                      </ul>
                      {canManage && <NewStatusRow onAdd={(name) => handleAddStatus(pipeline.id, name, category)} />}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <h2 className="mb-1 text-xl font-bold tracking-tight">Lost Reasons</h2>
      <p className="mb-4 text-sm text-muted-foreground">Katalog für die Verlustgründe verlorener Deals.</p>

      {canManage && (
        <form onSubmit={handleCreateLostReason} className="mb-4 flex gap-2">
          <Input
            value={newLostReasonLabel}
            onChange={(event) => setNewLostReasonLabel(event.target.value)}
            placeholder="Neuer Lost Reason"
            className="max-w-xs"
          />
          <Button type="submit" disabled={!newLostReasonLabel.trim()}>
            Hinzufügen
          </Button>
        </form>
      )}

      <ul className="flex flex-col gap-1.5">
        {lostReasons.map((reason) => (
          <li key={reason.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
            <span>
              {reason.label}
              {reason.archived && <Badge variant="outline" className="ml-2">Archiviert</Badge>}
            </span>
            {canManage && (
              <Button type="button" size="sm" variant="outline" onClick={() => handleToggleLostReasonArchived(reason)}>
                {reason.archived ? "Reaktivieren" : "Archive"}
              </Button>
            )}
          </li>
        ))}
      </ul>
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
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Neue Stage…" className="h-8 max-w-48 text-sm" />
      <Button type="submit" size="sm" variant="outline" disabled={!name.trim()}>
        Hinzufügen
      </Button>
    </form>
  );
}
