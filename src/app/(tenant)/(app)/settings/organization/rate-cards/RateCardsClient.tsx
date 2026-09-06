"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
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

export function RateCardsClient({
  canManage,
  rateCardItems,
  serviceTypes,
}: {
  canManage: boolean;
  rateCardItems: RateCardItemRow[];
  serviceTypes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("__none__");
  const [billingType, setBillingType] = useState("time_and_materials");
  const [trackingUnit, setTrackingUnit] = useState("hours");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/rate-card-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        serviceTypeId: serviceTypeId !== "__none__" ? serviceTypeId : undefined,
        billingType,
        trackingUnit,
        defaultPrice: Number(defaultPrice),
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Rate-Card-Eintrag konnte nicht angelegt werden.");
      return;
    }
    setName("");
    setServiceTypeId("__none__");
    setDefaultPrice("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tenant/rate-card-items/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Rate Cards</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Wiederverwendbare Service-Vorlagen (Name, Service Type, Billing Type, Tracking Unit, Preis), die beim Anlegen
        eines Budget-Services importiert werden können, statt jedes Mal neu einzutippen.
      </p>

      {rateCardItems.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Noch keine Rate-Card-Einträge.</p>
      ) : (
        <div className="mb-10 overflow-hidden rounded-lg border">
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
              {rateCardItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.serviceTypeName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{BILLING_TYPE_LABELS[item.billingType] ?? item.billingType}</TableCell>
                  <TableCell className="text-muted-foreground">{TRACKING_UNIT_LABELS[item.trackingUnit] ?? item.trackingUnit}</TableCell>
                  <TableCell className="text-right font-mono">{item.defaultPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
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

      {canManage && (
        <>
          <h2 className="mb-4 text-lg font-semibold">Neuer Rate-Card-Eintrag</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
            <Input
              placeholder="Name (z. B. Senior Developer)"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-48"
            />
            <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— kein Service Type —</SelectItem>
                {serviceTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={billingType} onValueChange={setBillingType}>
              <SelectTrigger className="w-40">
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
              <SelectTrigger className="w-32">
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
              className="w-28"
            />
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
