"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/components/popover";
import { cn } from "@/ui/shadcn/lib/utils";

export interface SavedViewRecord {
  id: string;
  name: string;
  viewType: string;
  filterConfig: Record<string, unknown>;
  sortConfig: Record<string, unknown> | null;
  sharedWithAll: boolean;
  ownerId: string;
}

// Reference §02 "Kontext-Subnav = gespeicherte Sichten als Tabs (persönlich/
// geteilt) + '+N more'" — how many views render as inline tabs before the
// rest collapse behind a "+N more" overflow popover.
const MAX_INLINE_TABS = 5;

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
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [sharedWithAll, setSharedWithAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
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
      if (activeViewId === id) setActiveViewId(null);
      await refreshViews();
    }
  }

  function applyView(view: SavedViewRecord) {
    setActiveViewId(view.id);
    setOverflowOpen(false);
    onApply(view);
  }

  function viewTab(view: SavedViewRecord) {
    const isActive = view.id === activeViewId;
    return (
      <span key={view.id} className="group flex items-center">
        <button
          type="button"
          onClick={() => applyView(view)}
          className={cn(
            "border-b-2 px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
            isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {view.name}
          {view.sharedWithAll && <span className="ml-1 text-xs font-normal text-muted-foreground">· geteilt</span>}
        </button>
        {view.ownerId === currentUserId && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => handleDelete(view.id)}
            title="View löschen"
            aria-label={`View "${view.name}" löschen`}
            className="opacity-0 group-hover:opacity-100"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </span>
    );
  }

  const inlineViews = views.slice(0, MAX_INLINE_TABS);
  const overflowViews = views.slice(MAX_INLINE_TABS);

  return (
    <div className="flex flex-wrap items-end gap-1 border-b">
      {inlineViews.map(viewTab)}

      {overflowViews.length > 0 && (
        <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "border-b-2 px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                overflowViews.some((v) => v.id === activeViewId) ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              +{overflowViews.length} more
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1">
            <div className="flex flex-col">
              {overflowViews.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => applyView(view)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                    view.id === activeViewId && "bg-accent/60 font-medium",
                  )}
                >
                  {view.name}
                  {view.sharedWithAll && " · geteilt"}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Button type="button" variant="ghost" size="sm" className="mb-0.5" onClick={() => setShowForm((current) => !current)}>
        {showForm ? "Abbrechen" : "Ansicht speichern"}
      </Button>

      {showForm && (
        <span className="mb-0.5 flex items-center gap-2">
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
      {error && <span className="mb-0.5 text-sm text-destructive">{error}</span>}
    </div>
  );
}
