"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";

export interface SavedViewRecord {
  id: string;
  name: string;
  viewType: string;
  filterConfig: Record<string, unknown>;
  sortConfig: Record<string, unknown> | null;
  sharedWithAll: boolean;
  ownerId: string;
}

/**
 * Speichert/lädt eine benannte Kombination aus Ansichtstyp + Filter + Sortierung
 * ("Saved View"). Wird auf projektgebundenen Listen (scope "project"/"budgets",
 * mit optionaler Freigabe für alle Projektmitglieder — Projektbezug erkannt an
 * `projectId`, nicht am konkreten scope-String) sowie auf "Meine Tasks" (scope
 * "my_tasks", rein privat — dort gibt es kein "alle") verwendet.
 */
export function SavedViewsBar({
  scope,
  projectId,
  initialViews,
  currentUserId,
  allowSharing,
  getCurrentConfig,
  onApply,
}: {
  scope: "project" | "budgets" | "my_tasks" | "time_entries";
  projectId?: string;
  initialViews: SavedViewRecord[];
  currentUserId: string;
  allowSharing: boolean;
  getCurrentConfig: () => { viewType: string; filterConfig: Record<string, unknown>; sortConfig: Record<string, unknown> };
  onApply: (view: SavedViewRecord) => void;
}) {
  const [views, setViews] = useState<SavedViewRecord[]>(initialViews);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [sharedWithAll, setSharedWithAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isProjectScoped = projectId !== undefined;

  async function refreshViews() {
    const params = new URLSearchParams();
    params.set("scope", scope);
    if (isProjectScoped) {
      params.set("projectId", projectId);
    }
    const response = await fetch(`/api/tenant/saved-views?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      setViews(data.views ?? []);
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const { viewType, filterConfig, sortConfig } = getCurrentConfig();
    const response = await fetch("/api/tenant/saved-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        projectId: isProjectScoped ? projectId : undefined,
        name: name.trim(),
        viewType,
        filterConfig,
        sortConfig,
        sharedWithAll: isProjectScoped ? sharedWithAll : false,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "View konnte nicht gespeichert werden.");
      return;
    }
    setName("");
    setSharedWithAll(false);
    setShowForm(false);
    await refreshViews();
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/tenant/saved-views/${id}`, { method: "DELETE" });
    if (response.ok) {
      await refreshViews();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {views.map((view) => (
        <span key={view.id} className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => onApply(view)}>
            {view.name}
            {view.sharedWithAll && " · geteilt"}
          </Button>
          {view.ownerId === currentUserId && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDelete(view.id)}
              title="View löschen"
              aria-label={`View "${view.name}" löschen`}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </span>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={() => setShowForm((current) => !current)}>
        {showForm ? "Abbrechen" : "Ansicht speichern"}
      </Button>

      {showForm && (
        <span className="flex items-center gap-2">
          <Input className="h-8" placeholder="Name der Ansicht" value={name} onChange={(event) => setName(event.target.value)} />
          {allowSharing && (
            <Label className="flex items-center gap-1.5 text-xs font-normal">
              <Checkbox checked={sharedWithAll} onCheckedChange={(v) => setSharedWithAll(v === true)} />
              Für alle im Projekt freigeben
            </Label>
          )}
          <Button type="button" size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
            Speichern
          </Button>
        </span>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
