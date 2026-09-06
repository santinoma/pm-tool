"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";

interface ServiceTypeRow {
  id: string;
  name: string;
}

export function ServiceTypesClient({ canManage, serviceTypes }: { canManage: boolean; serviceTypes: ServiceTypeRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/service-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Service Type konnte nicht angelegt werden.");
      return;
    }
    setName("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tenant/service-types/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Service Types</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Leistungstypen (z. B. Programming, Design, Project Management) zur Kategorisierung von Budget-Services für die
        Profitabilitätsauswertung.
      </p>

      {serviceTypes.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Noch keine Service Types.</p>
      ) : (
        <ul className="mb-10 flex flex-col gap-1.5">
          {serviceTypes.map((type) => (
            <li key={type.id} className="flex items-center justify-between text-sm">
              <span>{type.name}</span>
              {canManage && (
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(type.id)}>
                  Löschen
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <h2 className="mb-4 text-lg font-semibold">Neuer Service Type</h2>
          <form onSubmit={handleCreate} className="flex items-center gap-3">
            <Input placeholder="z. B. Programming" value={name} onChange={(event) => setName(event.target.value)} required className="w-56" />
            <Button type="submit" disabled={saving}>
              Anlegen
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
