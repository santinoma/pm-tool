"use client";

import { useEffect, useState } from "react";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

interface AuditLogEntryRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
  actor: { id: string; name: string | null; email: string } | null;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("de-DE");
}

export function AuditLogClient({ entityTypes }: { entityTypes: string[] }) {
  const [entityType, setEntityType] = useState("__all__");
  const [entries, setEntries] = useState<AuditLogEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (entityType !== "__all__") params.set("entityType", entityType);
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoading(true);
      })
      .then(() => fetch(`/api/tenant/audit-log?${params.toString()}`))
      .then((response) => (response.ok ? response.json() : { entries: [] }))
      .then((data) => {
        if (!cancelled) {
          setEntries(data.entries ?? []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [entityType]);

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Audit-Log</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Sicherheitsrelevante Aktionen in dieser Organisation (Rollenänderungen, API-Keys, SSO, ...).
      </p>

      <div className="mb-4 max-w-64">
        <Label htmlFor="audit-log-entity-type" className="mb-2 block">
          Entitätstyp
        </Label>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger id="audit-log-entity-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle</SelectItem>
            {entityTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Lädt…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Einträge.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zeitpunkt</TableHead>
                <TableHead>Akteur</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>Zusammenfassung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono whitespace-nowrap text-muted-foreground">{formatDate(entry.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.actor ? (entry.actor.name ?? entry.actor.email) : "System"}</TableCell>
                  <TableCell className="font-mono">{entry.action}</TableCell>
                  <TableCell>{entry.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
