"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/shadcn/components/card";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

interface RateCardItemRow {
  id: string;
  name: string;
  serviceTypeId: string | null;
  serviceTypeName: string | null;
  billingType: string;
  trackingUnit: string;
  defaultPrice: number;
}

interface RateCardRow {
  id: string;
  name: string;
  archived: boolean;
  clientId: string | null;
  clientName: string | null;
  items: RateCardItemRow[];
}

const BILLING_TYPE_LABELS: Record<string, string> = {
  time_and_materials: "Time & Materials",
  fixed: "Fixed",
  percentage: "Percentage",
  non_billable: "Non-billable",
};

const TRACKING_UNIT_LABELS: Record<string, string> = {
  hours: "Stunden",
  days: "Tage",
  piece: "Stück",
};

const NO_CLIENT = "__none__";

export function RateCardsClient({
  canManage,
  rateCards,
  serviceTypes,
  clients,
}: {
  canManage: boolean;
  rateCards: RateCardRow[];
  serviceTypes: { id: string; name: string }[];
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newRateCardName, setNewRateCardName] = useState("");
  const [newRateCardClientId, setNewRateCardClientId] = useState(NO_CLIENT);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateRateCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newRateCardName.trim()) return;
    setError(null);
    const response = await fetch("/api/tenant/rate-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newRateCardName,
        clientId: newRateCardClientId !== NO_CLIENT ? newRateCardClientId : undefined,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Rate Card konnte nicht angelegt werden.");
      return;
    }
    setNewRateCardName("");
    setNewRateCardClientId(NO_CLIENT);
    router.refresh();
  }

  async function handleToggleArchived(rateCard: RateCardRow) {
    await fetch(`/api/tenant/rate-cards/${rateCard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !rateCard.archived }),
    });
    router.refresh();
  }

  async function handleChangeClient(rateCard: RateCardRow, clientId: string) {
    await fetch(`/api/tenant/rate-cards/${rateCard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId !== NO_CLIENT ? clientId : null }),
    });
    router.refresh();
  }

  async function handleDeleteItem(rateCardId: string, itemId: string) {
    await fetch(`/api/tenant/rate-cards/${rateCardId}/items/${itemId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Rate Cards</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Eine Rate Card ist ein benannter, wiederverwendbarer Satz Service-Preise, optional einer Company zugeordnet.
        Beim Anlegen eines Budget-Services zeigt Productive automatisch die Rate Card der zugehörigen Company, oder
        andernfalls die Default Rate Card.
      </p>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {canManage && (
        <form onSubmit={handleCreateRateCard} className="mb-6 flex flex-wrap gap-2">
          <Input
            value={newRateCardName}
            onChange={(event) => setNewRateCardName(event.target.value)}
            placeholder="Name der neuen Rate Card"
            className="max-w-xs"
          />
          <Select value={newRateCardClientId} onValueChange={setNewRateCardClientId}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CLIENT}>— tenant-weit (keine Company) —</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={!newRateCardName.trim()}>
            Add Rate Card
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {rateCards.map((rateCard) => {
          const isExpanded = expandedId === rateCard.id;
          return (
            <Card key={rateCard.id}>
              <CardHeader
                className="cursor-pointer flex-row items-center justify-between gap-2 space-y-0"
                onClick={() => setExpandedId(isExpanded ? null : rateCard.id)}
              >
                <CardTitle className="flex items-center gap-2 text-sm">
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  {rateCard.name}
                  {rateCard.archived && <Badge variant="outline">Archiviert</Badge>}
                  <span className="font-normal text-muted-foreground">
                    {rateCard.clientName ?? "tenant-weit"} · {rateCard.items.length} Eintrag/Einträge
                  </span>
                </CardTitle>
                {canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleToggleArchived(rateCard);
                    }}
                  >
                    {rateCard.archived ? "Reaktivieren" : "Archive"}
                  </Button>
                )}
              </CardHeader>
              {isExpanded && (
                <CardContent className="flex flex-col gap-4">
                  {canManage && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Zugeordnete Company:
                      <Select
                        value={rateCard.clientId ?? NO_CLIENT}
                        onValueChange={(value) => handleChangeClient(rateCard, value)}
                      >
                        <SelectTrigger className="h-7 w-52 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_CLIENT}>— tenant-weit (keine Company) —</SelectItem>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  )}

                  {rateCard.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Noch keine Einträge.</p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Service Type</TableHead>
                            <TableHead>Billing Type</TableHead>
                            <TableHead>Tracking Unit</TableHead>
                            <TableHead className="text-right">Preis</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rateCard.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-muted-foreground">{item.serviceTypeName ?? "—"}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {BILLING_TYPE_LABELS[item.billingType] ?? item.billingType}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {TRACKING_UNIT_LABELS[item.trackingUnit] ?? item.trackingUnit}
                              </TableCell>
                              <TableCell className="text-right font-mono">{item.defaultPrice.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                {canManage && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteItem(rateCard.id, item.id)}
                                  >
                                    Löschen
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {canManage && <NewItemForm rateCardId={rateCard.id} serviceTypes={serviceTypes} />}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function NewItemForm({ rateCardId, serviceTypes }: { rateCardId: string; serviceTypes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState(NO_CLIENT);
  const [billingType, setBillingType] = useState("time_and_materials");
  const [trackingUnit, setTrackingUnit] = useState("hours");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !defaultPrice) return;
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/tenant/rate-cards/${rateCardId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        serviceTypeId: serviceTypeId !== NO_CLIENT ? serviceTypeId : undefined,
        billingType,
        trackingUnit,
        defaultPrice: Number(defaultPrice),
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Eintrag konnte nicht angelegt werden.");
      return;
    }
    setName("");
    setServiceTypeId(NO_CLIENT);
    setDefaultPrice("");
    router.refresh();
  }

  return (
    <div className="border-t pt-4">
      <h3 className="mb-2 text-sm font-semibold">Neuer Eintrag</h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <Input
          placeholder="Name (z. B. Senior Developer)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="h-8 w-48 text-sm"
        />
        <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CLIENT}>— kein Service Type —</SelectItem>
            {serviceTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={billingType} onValueChange={setBillingType}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(BILLING_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={trackingUnit} onValueChange={setTrackingUnit}>
          <SelectTrigger className="h-8 w-28 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TRACKING_UNIT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          step="0.01"
          placeholder="Preis"
          value={defaultPrice}
          onChange={(event) => setDefaultPrice(event.target.value)}
          required
          className="h-8 w-24 text-sm"
        />
        <Button type="submit" size="sm" disabled={saving || !name.trim()}>
          Anlegen
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
