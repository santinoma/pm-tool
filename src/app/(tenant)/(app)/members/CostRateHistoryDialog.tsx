"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/shadcn/components/dialog";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

export interface CostRateEntry {
  id: string;
  rateType: string;
  amount: number;
  currency: string;
  workHoursPerDay: number;
  startDate: string;
  endDate: string | null;
}

const RATE_TYPE_LABELS: Record<string, string> = {
  hourly: "Stündlich",
  weekly: "Wöchentlich",
  biweekly: "14-täglich",
  monthly: "Monatlich",
  annual: "Jährlich",
};

/**
 * Kostensatz-Historie eines Nutzers (T316, Productive "Understanding and
 * Setting Up Cost Rates"): datierte Einträge statt einer einzelnen Zahl —
 * über die Zeit skalierte Gehaltsänderungen bleiben nachvollziehbar.
 */
export function CostRateHistoryDialog({
  userId,
  userLabel,
  initialEntries,
  open,
  onOpenChange,
}: {
  userId: string;
  userLabel: string;
  initialEntries: CostRateEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<CostRateEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [rateType, setRateType] = useState("monthly");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [workHoursPerDay, setWorkHoursPerDay] = useState("8");
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadEntries() {
    setLoading(true);
    const response = await fetch(`/api/tenant/users/${userId}/cost-rate-history`);
    const data = await response.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  }

  async function handleAdd() {
    setError(null);
    if (!amount.trim() || !startDate) {
      setError("amount und startDate sind erforderlich.");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/tenant/users/${userId}/cost-rate-history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rateType,
        amount: Number(amount),
        currency,
        workHoursPerDay: Number(workHoursPerDay),
        startDate,
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Eintrag konnte nicht angelegt werden.");
      return;
    }
    setAmount("");
    setStartDate("");
    await loadEntries();
    router.refresh();
  }

  async function handleDelete(entryId: string) {
    await fetch(`/api/tenant/cost-rate-history/${entryId}`, { method: "DELETE" });
    await loadEntries();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kostensatz-Historie — {userLabel}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
          <div className="flex flex-col gap-1">
            <Label>Typ</Label>
            <Select value={rateType} onValueChange={setRateType}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RATE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Betrag</Label>
            <Input className="w-28" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Währung</Label>
            <Input className="w-20" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Std./Tag</Label>
            <Input className="w-20" type="number" value={workHoursPerDay} onChange={(e) => setWorkHoursPerDay(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Gültig ab</Label>
            <Input className="w-40" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <Button size="sm" onClick={handleAdd} loading={saving}>
            Kostensatz anlegen
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground">Lädt…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Kostensätze erfasst.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead>Gültig ab</TableHead>
                <TableHead>Gültig bis</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{RATE_TYPE_LABELS[entry.rateType] ?? entry.rateType}</TableCell>
                  <TableCell className="text-right font-mono">
                    {entry.amount.toFixed(2)} {entry.currency}
                  </TableCell>
                  <TableCell>{new Date(entry.startDate).toLocaleDateString("de-DE")}</TableCell>
                  <TableCell>{entry.endDate ? new Date(entry.endDate).toLocaleDateString("de-DE") : "laufend"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructiveSubtle" size="sm" onClick={() => handleDelete(entry.id)}>
                      Löschen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
