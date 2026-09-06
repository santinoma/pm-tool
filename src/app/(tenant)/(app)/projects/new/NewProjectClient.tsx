"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MODULE_CATALOG } from "@/tenant/projects/moduleCatalog";
import { PROJECT_COLOR_PALETTE } from "@/tenant/projects/colorPalette";

import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { cn } from "@/ui/shadcn/lib/utils";

type ProjectType = "client" | "internal";
type CreationMode = "scratch" | "template";

interface UserOption {
  id: string;
  label: string;
}

const STEP_LABELS = ["Typ", "Vorlage", "Details", "Module", "Mitglieder"];

function StepDot({ index, step }: { index: number; step: number }) {
  const stepNumber = index + 1;
  const isCurrent = stepNumber === step;
  const isDone = stepNumber < step;
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        isCurrent && "bg-primary text-primary-foreground",
        isDone && "bg-success/15 text-success",
        !isCurrent && !isDone && "bg-muted text-muted-foreground",
      )}
    >
      {stepNumber}
    </span>
  );
}

function OptionCard({
  checked,
  disabled,
  className,
  children,
  ...props
}: React.ComponentProps<"label"> & { checked: boolean; disabled?: boolean }) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 rounded-md border border-border px-4 py-3",
        disabled ? "cursor-default opacity-60" : "cursor-pointer",
        checked && "border-primary bg-primary/5",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function NewProjectClient({
  currentUserId,
  entitledFeatures,
  users,
  clients,
  templates,
}: {
  currentUserId: string;
  entitledFeatures: string[];
  users: UserOption[];
  clients: { id: string; name: string }[];
  templates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<ProjectType>("internal");
  const [mode, setMode] = useState<CreationMode>("scratch");
  const [templateProjectId, setTemplateProjectId] = useState(templates[0]?.id ?? "");

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLOR_PALETTE[0]);
  const [clientId, setClientId] = useState("");
  const [projectManagerId, setProjectManagerId] = useState(currentUserId);

  const [enabledModules, setEnabledModules] = useState<string[]>(["tasks"]);

  const [memberUserIds, setMemberUserIds] = useState<string[]>([currentUserId]);
  const [memberSearch, setMemberSearch] = useState("");

  const visibleModules = MODULE_CATALOG.filter(
    (entry) => !entry.requiresFeature || entitledFeatures.includes(entry.requiresFeature),
  );
  const grouped = ["Project management", "Financials", "More"] as const;

  function toggleModule(key: string) {
    setEnabledModules((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  function toggleMember(userId: string) {
    setMemberUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  const filteredUsers = users.filter((user) => user.label.toLowerCase().includes(memberSearch.toLowerCase()));

  async function handleCreate() {
    setError(null);
    setSubmitting(true);
    const response = await fetch("/api/tenant/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        color,
        clientId: clientId || undefined,
        projectManagerId: projectManagerId || undefined,
        templateProjectId: mode === "template" ? templateProjectId : undefined,
        enabledModules,
        memberUserIds,
      }),
    });
    const data = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(data.error ?? "Projekt konnte nicht angelegt werden.");
      return;
    }
    router.push(`/projects/${data.project.id}/list`);
    router.refresh();
  }

  function canAdvance(): boolean {
    if (step === 2 && mode === "template" && !templateProjectId) return false;
    if (step === 3 && name.trim().length === 0) return false;
    if (step === 4 && enabledModules.length === 0) return false;
    return true;
  }

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="mb-10 flex items-center justify-center gap-3">
        {STEP_LABELS.map((label, index) => (
          <span key={label} className="flex items-center gap-3">
            <StepDot index={index} step={step} />
            {index < STEP_LABELS.length - 1 && <span className="h-px w-4 bg-border" />}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h1 className="mb-2 text-center text-2xl font-bold tracking-tight">Projekttyp wählen</h1>
          <p className="mb-5 text-center text-sm text-muted-foreground">Wofür ist dieses Projekt gedacht?</p>
          <div className="flex flex-col gap-3">
            <OptionCard checked={type === "client"}>
              <input type="radio" checked={type === "client"} onChange={() => setType("client")} className="accent-primary" />
              <span>
                <strong className="text-sm font-semibold">Client Project</strong>
                <p className="mt-1 text-sm text-muted-foreground">Erwirtschaftet Umsatz/Profit für dein Unternehmen.</p>
              </span>
            </OptionCard>
            <OptionCard checked={type === "internal"}>
              <input type="radio" checked={type === "internal"} onChange={() => setType("internal")} className="accent-primary" />
              <span>
                <strong className="text-sm font-semibold">Internal Project</strong>
                <p className="mt-1 text-sm text-muted-foreground">Nur für euch selbst — kein Umsatz/Profit, nur Kosten.</p>
              </span>
            </OptionCard>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="mb-5 text-center text-2xl font-bold tracking-tight">Wie soll das Projekt entstehen?</h1>
          <div className="mb-5 flex flex-col gap-3">
            <OptionCard checked={mode === "scratch"}>
              <input type="radio" checked={mode === "scratch"} onChange={() => setMode("scratch")} className="accent-primary" />
              <span>
                <strong className="text-sm font-semibold">Create from scratch</strong>
                <p className="mt-1 text-sm text-muted-foreground">Neues Projekt ohne Vorlage (Standard-Status Todo/In Progress/Done).</p>
              </span>
            </OptionCard>
            <OptionCard checked={mode === "template"} disabled={templates.length === 0}>
              <input
                type="radio"
                checked={mode === "template"}
                onChange={() => setMode("template")}
                disabled={templates.length === 0}
                className="accent-primary"
              />
              <span>
                <strong className="text-sm font-semibold">Create from template</strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  {templates.length === 0
                    ? "Noch keine Vorlagen vorhanden (ein Projekt in seinen Einstellungen als Vorlage markieren)."
                    : "Klont Workflow-Status und Modul-Auswahl einer bestehenden Vorlage."}
                </p>
              </span>
            </OptionCard>
          </div>
          {mode === "template" && templates.length > 0 && (
            <Select value={templateProjectId} onValueChange={setTemplateProjectId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <h1 className="mb-6 text-center text-2xl font-bold tracking-tight">Projekt-Details</h1>
          <div className="mb-4 flex flex-col gap-2">
            <Label htmlFor="project-name">Name</Label>
            <div className="flex items-center gap-2 rounded-md border border-input px-2">
              <span className="flex shrink-0 items-center gap-1">
                {PROJECT_COLOR_PALETTE.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    aria-label={`Farbe ${swatch}`}
                    className={cn("size-4 rounded", color === swatch ? "ring-2 ring-foreground ring-offset-1" : "")}
                    style={{ background: swatch }}
                  />
                ))}
              </span>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="mb-4 flex flex-col gap-2">
            <Label htmlFor="project-client">Client</Label>
            <Select value={clientId || "none"} onValueChange={(value) => setClientId(value === "none" ? "" : value)}>
              <SelectTrigger id="project-client" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Kein Client —</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Firmen lassen sich in den Einstellungen anlegen.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-manager">Project manager</Label>
            <Select value={projectManagerId} onValueChange={setProjectManagerId}>
              <SelectTrigger id="project-manager" className="w-full">
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
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h1 className="mb-2 text-center text-2xl font-bold tracking-tight">Was braucht dieses Projekt?</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">Mindestens ein Modul muss gewählt sein.</p>
          {grouped.map((group) => {
            const entries = visibleModules.filter((entry) => entry.group === group);
            if (entries.length === 0) return null;
            return (
              <div key={group} className="mb-5">
                <div className="mb-2 text-xs font-semibold text-muted-foreground">{group}</div>
                <div className="grid grid-cols-2 gap-3">
                  {entries.map((entry) => {
                    const checked = enabledModules.includes(entry.key);
                    const disabled = entry.locked || !entry.real;
                    return (
                      <OptionCard key={entry.key} checked={checked} disabled={disabled} className={cn("px-4 py-3", !entry.real && "opacity-50")}>
                        <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggleModule(entry.key)} />
                        <span className="text-sm font-semibold">
                          {entry.label}
                          {!entry.real && <span className="font-normal text-muted-foreground"> (bald verfügbar)</span>}
                        </span>
                      </OptionCard>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {step === 5 && (
        <div>
          <h1 className="mb-2 text-center text-2xl font-bold tracking-tight">Personen einladen</h1>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Nur eingeladene Mitglieder können auf dieses Projekt zugreifen.
          </p>
          <Input
            placeholder="Person suchen…"
            value={memberSearch}
            onChange={(event) => setMemberSearch(event.target.value)}
            className="mb-3"
          />
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {filteredUsers.map((user) => (
              <label key={user.id} className="flex items-center gap-2.5 py-1 text-sm">
                <Checkbox
                  checked={memberUserIds.includes(user.id)}
                  disabled={user.id === currentUserId}
                  onCheckedChange={() => toggleMember(user.id)}
                />
                {user.label}
                {user.id === currentUserId && <span className="text-muted-foreground"> (du)</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-8 flex gap-3">
        {step < 5 ? (
          <Button onClick={() => setStep((current) => current + 1)} disabled={!canAdvance()}>
            Continue
          </Button>
        ) : (
          <Button onClick={handleCreate} loading={submitting}>
            {submitting ? "Wird angelegt…" : "Create Project"}
          </Button>
        )}
        <Button variant="outline" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}>
          Back
        </Button>
      </div>
    </div>
  );
}
