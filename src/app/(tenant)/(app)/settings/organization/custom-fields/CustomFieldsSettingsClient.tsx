"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/shadcn/components/card";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

interface ProjectOption {
  id: string;
  name: string;
}

interface FieldRow {
  id: string;
  key: string;
  label: string;
  type: string;
  entityType: string;
  options: string[];
  attachedProjects: ProjectOption[];
}

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Zahl",
  select: "Auswahl",
  multi_select: "Mehrfachauswahl",
  date: "Datum",
  person: "Person",
  url: "URL",
  percent: "Prozent",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  task: "Tasks",
  budget: "Budgets",
  wiki_page: "Docs",
};

const OPTIONS_REQUIRED_TYPES = ["select", "multi_select"];

export function CustomFieldsSettingsClient({
  canManage,
  fields,
  projects,
}: {
  canManage: boolean;
  fields: FieldRow[];
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [entityType, setEntityType] = useState("task");
  const [optionsText, setOptionsText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!key.trim() || !label.trim()) return;
    const options = optionsText
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);
    if (OPTIONS_REQUIRED_TYPES.includes(type) && options.length === 0) {
      setError("select/multi_select-Felder benötigen mindestens eine Option (kommagetrennt).");
      return;
    }
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, label, type, entityType, options }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Feld konnte nicht angelegt werden.");
      return;
    }
    setKey("");
    setLabel("");
    setOptionsText("");
    router.refresh();
  }

  async function handleAttach(fieldId: string, projectId: string) {
    if (!projectId) return;
    const response = await fetch(`/api/tenant/custom-fields/${fieldId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (response.ok) router.refresh();
  }

  async function handleDetach(fieldId: string, projectId: string) {
    await fetch(`/api/tenant/custom-fields/${fieldId}/attachments/${projectId}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleDelete(fieldId: string) {
    const response = await fetch(`/api/tenant/custom-fields/${fieldId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Feld konnte nicht gelöscht werden.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Custom Fields</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Ein Library-Feld wird einmal definiert und kann an beliebig viele Projekte angehängt werden — eine Änderung am
        Feld (Label, Optionen) wirkt sich überall aus, wo es angehängt ist. Projektspezifische Felder verwaltest du
        weiterhin direkt im jeweiligen Projekt unter Einstellungen → Workflow.
      </p>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {canManage && (
        <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-2">
          <Input value={key} onChange={(event) => setKey(event.target.value)} placeholder="key (z. B. priority_tier)" className="w-44" />
          <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label" className="w-44" />
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ENTITY_TYPE_LABELS).map(([value, l]) => (
                <SelectItem key={value} value={value}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([value, l]) => (
                <SelectItem key={value} value={value}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {OPTIONS_REQUIRED_TYPES.includes(type) && (
            <Input
              value={optionsText}
              onChange={(event) => setOptionsText(event.target.value)}
              placeholder="Optionen, kommagetrennt"
              className="w-56"
            />
          )}
          <Button type="submit" disabled={saving || !key.trim() || !label.trim()}>
            Add Field
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {fields.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Library-Felder.</p>}
        {fields.map((field) => {
          const isExpanded = expandedId === field.id;
          const attachableProjects = projects.filter((project) => !field.attachedProjects.some((p) => p.id === project.id));
          return (
            <Card key={field.id}>
              <CardHeader
                className="cursor-pointer flex-row items-center justify-between gap-2 space-y-0"
                onClick={() => setExpandedId(isExpanded ? null : field.id)}
              >
                <CardTitle className="flex items-center gap-2 text-sm">
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  {field.label}
                  <Badge variant="outline">{ENTITY_TYPE_LABELS[field.entityType] ?? field.entityType}</Badge>
                  <Badge variant="outline">{TYPE_LABELS[field.type] ?? field.type}</Badge>
                  <span className="font-normal text-muted-foreground">
                    {field.attachedProjects.length} Projekt(e)
                  </span>
                </CardTitle>
                {canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(field.id);
                    }}
                  >
                    Löschen
                  </Button>
                )}
              </CardHeader>
              {isExpanded && (
                <CardContent className="flex flex-col gap-3">
                  {field.options.length > 0 && (
                    <p className="text-xs text-muted-foreground">Optionen: {field.options.join(", ")}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {field.attachedProjects.map((project) => (
                      <Badge key={project.id} variant="secondary" className="gap-1 pr-1">
                        {project.name}
                        {canManage && (
                          <button type="button" onClick={() => handleDetach(field.id, project.id)} className="rounded-sm hover:bg-muted">
                            <X className="size-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  {canManage && attachableProjects.length > 0 && (
                    <Select value="" onValueChange={(value) => handleAttach(field.id, value)}>
                      <SelectTrigger className="h-8 w-56 text-sm">
                        <SelectValue placeholder="An Projekt anhängen…" />
                      </SelectTrigger>
                      <SelectContent>
                        {attachableProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
