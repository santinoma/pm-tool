"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CsvImportModal } from "@/ui/components/CsvImportModal";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

interface ClientRow {
  id: string;
  name: string;
  note: string | null;
  taxId: string | null;
  website: string | null;
  billingAddress: string | null;
  archivedAt: string | null;
  parentId: string | null;
}

interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

interface ActivityRow {
  id: string;
  summary: string;
  createdAt: string;
  actorName: string;
  projectName: string;
}

type StatusFilter = "active" | "archived" | "all";

function computeDescendantIds(clientId: string, clients: ClientRow[]): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const client of clients) {
    if (!client.parentId) continue;
    const list = childrenByParent.get(client.parentId) ?? [];
    list.push(client.id);
    childrenByParent.set(client.parentId, list);
  }
  const descendants = new Set<string>();
  const queue = [...(childrenByParent.get(clientId) ?? [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (descendants.has(current)) continue;
    descendants.add(current);
    const children = childrenByParent.get(current);
    if (children) queue.push(...children);
  }
  return descendants;
}

export function ClientsClient({ canManage, clients }: { canManage: boolean; clients: ClientRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [taxId, setTaxId] = useState("");
  const [website, setWebsite] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [parentId, setParentId] = useState("__none__");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        note: note || undefined,
        taxId: taxId || undefined,
        website: website || undefined,
        billingAddress: billingAddress || undefined,
        parentId: parentId !== "__none__" ? parentId : undefined,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Client konnte nicht angelegt werden.");
      return;
    }
    setName("");
    setNote("");
    setTaxId("");
    setWebsite("");
    setBillingAddress("");
    setParentId("__none__");
    router.refresh();
  }

  async function handleDelete(clientId: string) {
    const confirmed = window.confirm("Client wirklich löschen? Zugeordnete Projekte verlieren die Zuordnung.");
    if (!confirmed) return;
    await fetch(`/api/tenant/clients/${clientId}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleArchiveToggle(client: ClientRow) {
    await fetch(`/api/tenant/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivedAt: client.archivedAt ? null : new Date().toISOString() }),
    });
    router.refresh();
  }

  const filteredClients = useMemo(() => {
    if (statusFilter === "all") return clients;
    if (statusFilter === "archived") return clients.filter((c) => c.archivedAt);
    return clients.filter((c) => !c.archivedAt);
  }, [clients, statusFilter]);

  // Nested rendering: root-level clients (no parent, or parent not in the filtered set) first,
  // each followed by its children indented underneath.
  const byParent = useMemo(() => {
    const map = new Map<string, ClientRow[]>();
    for (const client of filteredClients) {
      const key = client.parentId ?? "";
      const list = map.get(key) ?? [];
      list.push(client);
      map.set(key, list);
    }
    return map;
  }, [filteredClients]);

  function renderTree(parentKey: string, depth: number): React.ReactNode[] {
    const rows = byParent.get(parentKey) ?? [];
    return rows.flatMap((client) => [
      <ClientRowItem
        key={client.id}
        client={client}
        depth={depth}
        canManage={canManage}
        expanded={expandedId === client.id}
        onToggleExpand={() => setExpandedId(expandedId === client.id ? null : client.id)}
        onArchiveToggle={() => handleArchiveToggle(client)}
        onDelete={() => handleDelete(client.id)}
        allClients={clients}
        onSaved={() => router.refresh()}
      />,
      ...renderTree(client.id, depth + 1),
    ]);
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Clients</h1>
      <p className="mb-6 text-sm text-muted-foreground">Firmen, für die Projekte angelegt werden können.</p>

      <div className="mb-6 flex items-center gap-3">
        <Label htmlFor="status-filter" className="text-sm text-muted-foreground">
          Status
        </Label>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <SelectTrigger id="status-filter" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="archived">Archiviert</SelectItem>
            <SelectItem value="all">Alle</SelectItem>
          </SelectContent>
        </Select>
        {canManage && (
          <Button type="button" variant="outline" onClick={() => setImportingCsv(true)}>
            CSV importieren
          </Button>
        )}
      </div>

      {importingCsv && (
        <CsvImportModal
          title="Clients per CSV importieren"
          importUrl="/api/tenant/imports/clients"
          templateUrl="/api/tenant/imports/clients/template"
          onClose={() => setImportingCsv(false)}
          onImported={() => router.refresh()}
        />
      )}

      {filteredClients.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Keine Clients in dieser Ansicht.</p>
      ) : (
        <ul className="mb-10 flex flex-col gap-2">{renderTree("", 0)}</ul>
      )}

      {canManage && (
        <>
          <h2 className="mb-4 text-lg font-semibold">Neuer Client</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
            <Input placeholder="Firmenname" value={name} onChange={(event) => setName(event.target.value)} required className="w-48" />
            <Input placeholder="Notiz (optional)" value={note} onChange={(event) => setNote(event.target.value)} className="w-48" />
            <Input placeholder="USt-IdNr. (optional)" value={taxId} onChange={(event) => setTaxId(event.target.value)} className="w-48" />
            <Input placeholder="Website (optional)" value={website} onChange={(event) => setWebsite(event.target.value)} className="w-48" />
            <Input
              placeholder="Rechnungsadresse (optional)"
              value={billingAddress}
              onChange={(event) => setBillingAddress(event.target.value)}
              className="w-56"
            />
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Kein übergeordneter Client</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

function ClientRowItem({
  client,
  depth,
  canManage,
  expanded,
  onToggleExpand,
  onArchiveToggle,
  onDelete,
  allClients,
  onSaved,
}: {
  client: ClientRow;
  depth: number;
  canManage: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
  allClients: ClientRow[];
  onSaved: () => void;
}) {
  return (
    <li>
      <div className="flex items-center justify-between text-sm" style={{ paddingLeft: `${depth * 20}px` }}>
        <span>
          {client.name}
          {client.archivedAt && <span className="font-mono text-xs text-muted-foreground/70"> (archiviert)</span>}
          {client.note && <span className="font-mono text-xs text-muted-foreground"> — {client.note}</span>}
        </span>
        <span className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onToggleExpand}>
            {expanded ? "Details ausblenden" : "Details"}
          </Button>
          {canManage && (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={onArchiveToggle}>
                {client.archivedAt ? "Wiederherstellen" : "Archivieren"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
                Löschen
              </Button>
            </>
          )}
        </span>
      </div>
      {expanded && <ClientDetailsPanel client={client} canManage={canManage} allClients={allClients} onSaved={onSaved} />}
    </li>
  );
}

function ClientDetailsPanel({
  client,
  canManage,
  allClients,
  onSaved,
}: {
  client: ClientRow;
  canManage: boolean;
  allClients: ClientRow[];
  onSaved: () => void;
}) {
  const [name, setName] = useState(client.name);
  const [note, setNote] = useState(client.note ?? "");
  const [taxId, setTaxId] = useState(client.taxId ?? "");
  const [website, setWebsite] = useState(client.website ?? "");
  const [billingAddress, setBillingAddress] = useState(client.billingAddress ?? "");
  const [parentId, setParentId] = useState(client.parentId ?? "__none__");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactPrimary, setContactPrimary] = useState(false);

  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setContactsLoading(true);
      })
      .then(() => fetch(`/api/tenant/clients/${client.id}/contacts`))
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled) setContacts(body.contacts ?? []);
      })
      .finally(() => {
        if (!cancelled) setContactsLoading(false);
      });
    Promise.resolve()
      .then(() => {
        if (!cancelled) setActivityLoading(true);
      })
      .then(() => fetch(`/api/tenant/clients/${client.id}/activity`))
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled) setActivity(body.events ?? []);
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client.id]);

  const excludedParentIds = useMemo(() => {
    const descendants = computeDescendantIds(client.id, allClients);
    descendants.add(client.id);
    return descendants;
  }, [client.id, allClients]);

  async function refetchContacts() {
    const response = await fetch(`/api/tenant/clients/${client.id}/contacts`);
    const body = await response.json().catch(() => ({}));
    setContacts(body.contacts ?? []);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch(`/api/tenant/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        note: note || null,
        taxId: taxId || null,
        website: website || null,
        billingAddress: billingAddress || null,
        parentId: parentId !== "__none__" ? parentId : null,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    onSaved();
  }

  async function handleAddContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contactName.trim()) return;
    await fetch(`/api/tenant/clients/${client.id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: contactName,
        email: contactEmail || undefined,
        phone: contactPhone || undefined,
        isPrimary: contactPrimary,
      }),
    });
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setContactPrimary(false);
    await refetchContacts();
  }

  async function handleMakePrimary(contact: ContactRow) {
    await fetch(`/api/tenant/clients/${client.id}/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    await refetchContacts();
  }

  async function handleRemoveContact(contact: ContactRow) {
    await fetch(`/api/tenant/clients/${client.id}/contacts/${contact.id}`, { method: "DELETE" });
    await refetchContacts();
  }

  return (
    <Card className="mt-2 ml-5">
      <CardContent>
        {canManage && (
          <form onSubmit={handleSave} className="mb-5">
            <h3 className="mb-3 text-sm font-semibold">Profil</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Firmenname" required className="w-44" />
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz" className="w-44" />
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="USt-IdNr." className="w-44" />
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" className="w-44" />
              <Input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} placeholder="Rechnungsadresse" className="w-52" />
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Kein übergeordneter Client</SelectItem>
                  {allClients
                    .filter((c) => !excludedParentIds.has(c.id))
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" disabled={saving}>
                Speichern
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </form>
        )}

        <h3 className="mb-3 text-sm font-semibold">Kontakte</h3>
        {contactsLoading ? (
          <p className="text-sm text-muted-foreground">Lädt…</p>
        ) : contacts.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">Noch keine Kontakte.</p>
        ) : (
          <ul className="mb-3 flex flex-col gap-1.5">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between text-sm">
                <span>
                  {contact.name}
                  {contact.isPrimary && <span className="font-mono text-xs text-muted-foreground"> (primär)</span>}
                  {contact.email && <span className="font-mono text-xs text-muted-foreground"> · {contact.email}</span>}
                  {contact.phone && <span className="font-mono text-xs text-muted-foreground"> · {contact.phone}</span>}
                </span>
                {canManage && (
                  <span className="flex items-center gap-2">
                    {!contact.isPrimary && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleMakePrimary(contact)}>
                        Als primär markieren
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveContact(contact)}>
                      Entfernen
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {canManage && (
          <form onSubmit={handleAddContact} className="mb-5 flex flex-wrap items-center gap-2">
            <Input placeholder="Name" value={contactName} onChange={(e) => setContactName(e.target.value)} required className="w-40" />
            <Input placeholder="E-Mail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-40" />
            <Input placeholder="Telefon" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-40" />
            <Label className="flex items-center gap-1.5 font-normal">
              <Checkbox checked={contactPrimary} onCheckedChange={(v) => setContactPrimary(v === true)} />
              Primär
            </Label>
            <Button type="submit" variant="outline" size="sm">
              Kontakt hinzufügen
            </Button>
          </form>
        )}

        <h3 className="mb-3 text-sm font-semibold">Aktivität</h3>
        {activityLoading ? (
          <p className="text-sm text-muted-foreground">Lädt…</p>
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Aktivität in den zugeordneten Projekten.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {activity.map((event) => (
              <li key={event.id}>
                <span className="block font-mono text-xs text-muted-foreground/70">
                  {new Date(event.createdAt).toLocaleString("de-DE")}
                </span>
                <div className="text-sm">
                  <strong>{event.projectName}</strong>: {event.summary}{" "}
                  <span className="text-muted-foreground">({event.actorName})</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
