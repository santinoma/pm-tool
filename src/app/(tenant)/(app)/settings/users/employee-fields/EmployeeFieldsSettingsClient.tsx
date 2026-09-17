"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

interface FieldRow {
  id: string;
  key: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  sensitive: boolean;
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

const OPTIONS_REQUIRED_TYPES = ["select", "multi_select"];

export function EmployeeFieldsSettingsClient({ canManage, fields }: { canManage: boolean; fields: FieldRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [optionsText, setOptionsText] = useState("");
  const [required, setRequired] = useState(false);
  const [sensitive, setSensitive] = useState(false);
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
      body: JSON.stringify({ key, label, type, entityType: "user", options, required, sensitive }),
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
    setRequired(false);
    setSensitive(false);
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
    <div className="mx-auto max-w-2xl pb-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Employee fields</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Eigene Personaldaten-Felder für Mitglieder (z. B. Personalnummer, Vertragsart, Standort) — organisationsweit,
        nicht an ein einzelnes Projekt gebunden.
      </p>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {canManage && (
        <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-2">
          <Input value={key} onChange={(event) => setKey(event.target.value)} placeholder="key (z. B. personnel_number)" className="w-48" />
          <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label" className="w-44" />
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
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Checkbox checked={required} onCheckedChange={(checked) => setRequired(checked === true)} />
            Pflichtfeld
          </label>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Checkbox checked={sensitive} onCheckedChange={(checked) => setSensitive(checked === true)} />
            Sensibel
          </label>
          <Button type="submit" disabled={saving || !key.trim() || !label.trim()}>
            Feld hinzufügen
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {fields.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Employee Fields definiert.</p>}
        {fields.map((field) => (
          <Card key={field.id}>
            <CardContent className="flex items-center justify-between gap-2 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{field.label}</span>
                <Badge variant="outline">{TYPE_LABELS[field.type] ?? field.type}</Badge>
                {field.required && <Badge variant="secondary">Pflichtfeld</Badge>}
                {field.sensitive && <Badge variant="secondary">Sensibel</Badge>}
                {field.options.length > 0 && (
                  <span className="text-xs text-muted-foreground">{field.options.join(", ")}</span>
                )}
              </div>
              {canManage && (
                <Button type="button" size="sm" variant="outline" onClick={() => handleDelete(field.id)}>
                  Löschen
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
