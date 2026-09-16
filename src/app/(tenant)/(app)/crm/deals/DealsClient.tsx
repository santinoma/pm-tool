"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutGrid, Rows3 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/ui/shadcn/components/avatar";
import { Button } from "@/ui/shadcn/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/shadcn/components/dialog";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { Textarea } from "@/ui/shadcn/components/textarea";
import { cn } from "@/ui/shadcn/lib/utils";

function currencyFormat(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

interface CompanyOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  label: string;
}

interface StatusOption {
  id: string;
  name: string;
  category: string;
  position: number;
}

interface LostReasonOption {
  id: string;
  label: string;
}

interface Deal {
  id: string;
  title: string;
  statusId: string;
  statusName: string;
  statusCategory: string;
  companyId: string;
  companyName: string;
  ownerLabel: string;
  estimatedValue: number | null;
  probability: number | null;
  lostReasonId: string | null;
  lostReasonLabel: string | null;
  lostReasonNote: string | null;
}

export function DealsClient({
  deals,
  companies,
  users,
  statuses,
  lostReasons,
}: {
  deals: Deal[];
  companies: CompanyOption[];
  users: UserOption[];
  statuses: StatusOption[];
  lostReasons: LostReasonOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState(users[0]?.id ?? "");
  const [statusId, setStatusId] = useState(statuses[0]?.id ?? "");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [probability, setProbability] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [lostDealPending, setLostDealPending] = useState<{ deal: Deal; targetStatusId: string } | null>(null);
  const [lostReasonId, setLostReasonId] = useState("");
  const [lostReasonNote, setLostReasonNote] = useState("");
  // Reference §03: Board (Kanban) is the pipeline's primary layout, "umschaltbar auf Liste".
  const [layout, setLayout] = useState<"board" | "list">("board");
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);

  function toggleGroup(key: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        companyId,
        ownerId,
        statusId,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
        probability: probability ? Number(probability) : undefined,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Deal konnte nicht angelegt werden.");
      return;
    }
    setTitle("");
    setEstimatedValue("");
    setProbability("");
    setStatusId(statuses[0]?.id ?? "");
    router.refresh();
  }

  async function handleStatusChange(dealId: string, newStatusId: string, reasonId?: string, reasonNote?: string) {
    setStatusOverrides((current) => ({ ...current, [dealId]: newStatusId }));
    await fetch(`/api/tenant/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statusId: newStatusId,
        ...(reasonId ? { lostReasonId: reasonId } : {}),
        ...(reasonNote !== undefined ? { lostReasonNote: reasonNote } : {}),
      }),
    });
    router.refresh();
  }

  function handleStatusSelect(deal: Deal, targetStatusId: string) {
    const targetStatus = statuses.find((s) => s.id === targetStatusId);
    if (targetStatus?.category === "lost") {
      setLostReasonId(deal.lostReasonId ?? "");
      setLostReasonNote(deal.lostReasonNote ?? "");
      setLostDealPending({ deal, targetStatusId });
      return;
    }
    handleStatusChange(deal.id, targetStatusId);
  }

  async function confirmLostReason() {
    if (!lostDealPending || !lostReasonId) return;
    await handleStatusChange(lostDealPending.deal.id, lostDealPending.targetStatusId, lostReasonId, lostReasonNote.trim() || undefined);
    setLostDealPending(null);
    setLostReasonId("");
    setLostReasonNote("");
  }

  const groups = useMemo(() => {
    const byStatus = new Map<string, Deal[]>();
    for (const deal of deals) {
      const list = byStatus.get(deal.statusId);
      if (list) list.push(deal);
      else byStatus.set(deal.statusId, [deal]);
    }
    return statuses
      .filter((status) => byStatus.has(status.id))
      .map((status) => ({ key: status.id, label: status.name, rows: byStatus.get(status.id)! }));
  }, [deals, statuses]);

  // Reference: "Spaltenkopf zeigt Stufensumme" — every board column, even
  // empty ones, so drag targets stay visible.
  const boardColumns = useMemo(
    () =>
      statuses.map((status) => {
        const rows = deals.filter((deal) => (statusOverrides[deal.id] ?? deal.statusId) === status.id);
        return { key: status.id, label: status.name, rows, valueSum: rows.reduce((sum, deal) => sum + (deal.estimatedValue ?? 0), 0) };
      }),
    [deals, statuses, statusOverrides],
  );

  return (
    <div className="py-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
        <div className="inline-flex rounded-md border p-0.5">
          <Button
            type="button"
            variant={layout === "board" ? "default" : "ghost"}
            size="sm"
            onClick={() => setLayout("board")}
          >
            <LayoutGrid className="size-4" />
            Board
          </Button>
          <Button type="button" variant={layout === "list" ? "default" : "ghost"} size="sm" onClick={() => setLayout("list")}>
            <Rows3 className="size-4" />
            Liste
          </Button>
        </div>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">Alle Deals, gruppiert nach Stage.</p>

      {companies.length > 0 && statuses.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Neuer Deal</h2>
          <form onSubmit={handleSubmit} className="mb-8 flex flex-wrap gap-3">
            <Input placeholder="Titel" value={title} onChange={(event) => setTitle(event.target.value)} required className="min-w-44 flex-1" />
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Company" /></SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              step="0.01"
              placeholder="Wert"
              value={estimatedValue}
              onChange={(event) => setEstimatedValue(event.target.value)}
              className="w-32"
            />
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="Wahrsch. %"
              value={probability}
              onChange={(event) => setProbability(event.target.value)}
              className="w-28"
            />
            <Button type="submit" loading={saving}>
              Anlegen
            </Button>
          </form>
          {error && <p className="mb-6 text-sm text-destructive">{error}</p>}
        </>
      )}

      {groups.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Deals</h3>
        </div>
      ) : layout === "board" ? (
        <div className="flex items-start gap-4 overflow-x-auto pb-6">
          {boardColumns.map((column) => (
            <div
              key={column.key}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverStatusId(column.key);
              }}
              onDragLeave={() => setDragOverStatusId(null)}
              onDrop={(event) => {
                event.preventDefault();
                const dealId = event.dataTransfer.getData("text/deal-id");
                setDragOverStatusId(null);
                const deal = deals.find((d) => d.id === dealId);
                if (deal) handleStatusSelect(deal, column.key);
              }}
              className={cn(
                "min-w-64 shrink-0 rounded-lg border bg-muted/40 p-3 transition-colors",
                dragOverStatusId === column.key && "border-primary bg-primary/5",
              )}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{column.label}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{currencyFormat(column.valueSum)}</span>
              </div>
              <div className="flex flex-col gap-2">
                {column.rows.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/deal-id", deal.id)}
                    className="flex cursor-grab flex-col gap-1.5 rounded-md border bg-card p-3 text-sm shadow-xs transition-shadow hover:shadow-md"
                  >
                    <span className="font-medium">{deal.title}</span>
                    <span className="text-xs text-muted-foreground">{deal.companyName}</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {deal.estimatedValue !== null ? currencyFormat(deal.estimatedValue) : "—"}
                      </span>
                      <Avatar className="size-5">
                        <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                          {deal.ownerLabel.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Wert</TableHead>
                <TableHead>Wahrscheinlichkeit</TableHead>
                <TableHead>Lost-Grund</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const isCollapsed = collapsedGroups.has(group.key);
                return (
                  <Fragment key={group.key}>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={7} className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          className="flex w-full items-center gap-3 px-2 py-2 text-left"
                        >
                          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                          <span className="font-medium">{group.label}</span>
                          <span className="text-xs text-muted-foreground">{group.rows.length}</span>
                        </button>
                      </TableCell>
                    </TableRow>
                    {!isCollapsed &&
                      group.rows.map((deal) => {
                        const currentStatusId = statusOverrides[deal.id] ?? deal.statusId;
                        const currentStatus = statuses.find((s) => s.id === currentStatusId);
                        return (
                          <TableRow key={deal.id}>
                            <TableCell className="font-semibold">{deal.title}</TableCell>
                            <TableCell className="text-muted-foreground">{deal.companyName}</TableCell>
                            <TableCell className="text-muted-foreground">{deal.ownerLabel}</TableCell>
                            <TableCell>
                              <Select value={currentStatusId} onValueChange={(value) => handleStatusSelect(deal, value)}>
                                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {statuses.map((status) => (
                                    <SelectItem key={status.id} value={status.id}>
                                      {status.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{deal.estimatedValue !== null ? deal.estimatedValue.toFixed(2) : "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{deal.probability !== null ? `${deal.probability}%` : "—"}</TableCell>
                            <TableCell className="max-w-56 truncate text-muted-foreground" title={deal.lostReasonLabel ?? undefined}>
                              {currentStatus?.category === "lost" ? (deal.lostReasonLabel ?? "—") : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={lostDealPending !== null} onOpenChange={(open) => !open && setLostDealPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deal als verloren markieren</DialogTitle>
            <DialogDescription>
              Warum wurde „{lostDealPending?.deal.title}&rdquo; nicht gewonnen? Der Grund hilft bei der Auswertung verlorener Deals.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lost-reason">Verlustgrund</Label>
            <Select value={lostReasonId} onValueChange={setLostReasonId}>
              <SelectTrigger id="lost-reason" className="w-full"><SelectValue placeholder="Grund wählen…" /></SelectTrigger>
              <SelectContent>
                {lostReasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label htmlFor="lost-reason-note" className="mt-2">
              Notiz (optional)
            </Label>
            <Textarea
              id="lost-reason-note"
              value={lostReasonNote}
              onChange={(event) => setLostReasonNote(event.target.value)}
              placeholder="Weitere Details, z. B. konkretes Feedback vom Kunden…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLostDealPending(null)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={confirmLostReason} disabled={!lostReasonId}>
              Als verloren markieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
