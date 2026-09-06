"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/ui/shadcn/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

interface SharedViewRow {
  id: string;
  token: string;
  statusCategoryFilter: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

export function SharedViewsPanel({ projectId, views }: { projectId: string; views: SharedViewRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [statusCategoryFilter, setStatusCategoryFilter] = useState("__all__");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Erfasst "jetzt" einmalig beim ersten Render statt Date.now() während des
  // Renderns aufzurufen (unrein) — für die Ablauf-Anzeige reicht ein statischer
  // Referenzpunkt, kein live tickender Timer.
  const [now] = useState(() => Date.now());

  async function handleCreate() {
    setError(null);
    setSaving(true);
    const response = await fetch(`/api/tenant/projects/${projectId}/shared-views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusCategoryFilter: statusCategoryFilter === "__all__" ? null : statusCategoryFilter }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Link konnte nicht erstellt werden.");
      return;
    }
    router.refresh();
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/tenant/shared-views/${id}`, { method: "PATCH" });
    router.refresh();
  }

  const shareOrigin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)} className="mb-4">
        Freigabe-Links
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </Button>

      {open && (
        <div className="mb-6 rounded-lg border p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Select value={statusCategoryFilter} onValueChange={setStatusCategoryFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Alle Status-Kategorien</SelectItem>
                <SelectItem value="not_started">Nicht begonnen</SelectItem>
                <SelectItem value="started">In Arbeit</SelectItem>
                <SelectItem value="done">Erledigt</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleCreate} loading={saving}>
              Neuen Link erstellen
            </Button>
          </div>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

          {views.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Freigabe-Links.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {views.map((view) => {
                const isRevoked = view.revokedAt !== null;
                const isExpired = view.expiresAt !== null && new Date(view.expiresAt).getTime() < now;
                return (
                  <li key={view.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
                    <span className="text-xs text-muted-foreground">
                      {isRevoked ? (
                        <span>Widerrufen</span>
                      ) : isExpired ? (
                        <span>Abgelaufen</span>
                      ) : (
                        `${shareOrigin}/shared/${view.token}`
                      )}
                    </span>
                    {!isRevoked && !isExpired && (
                      <Button variant="destructiveSubtle" size="sm" onClick={() => handleRevoke(view.id)}>
                        Widerrufen
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
