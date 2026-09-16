"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Badge } from "@/ui/shadcn/components/badge";

interface MonthRow {
  periodKey: string;
  locked: boolean;
  isOverride: boolean;
  lockedByLabel: string | null;
}

function formatPeriodKey(periodKey: string): string {
  const [year, month] = periodKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function FinancialMonthClosingClient({
  canManage,
  enabled: initialEnabled,
  closingDay: initialClosingDay,
  months: initialMonths,
}: {
  canManage: boolean;
  enabled: boolean;
  closingDay: number;
  months: MonthRow[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [closingDay, setClosingDay] = useState(initialClosingDay.toString());
  const [months, setMonths] = useState<MonthRow[]>(initialMonths);
  const [saving, setSaving] = useState(false);
  const [busyPeriodKey, setBusyPeriodKey] = useState<string | null>(null);

  async function loadMonths() {
    const response = await fetch("/api/tenant/financial-period-locks");
    const data = await response.json();
    setMonths(data.months ?? []);
  }

  async function handleSaveSettings() {
    setSaving(true);
    await fetch("/api/tenant/tenant-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ financialMonthClosingEnabled: enabled, financialMonthClosingDay: Number(closingDay) }),
    });
    setSaving(false);
    await loadMonths();
    router.refresh();
  }

  async function toggleMonth(month: MonthRow) {
    setBusyPeriodKey(month.periodKey);
    await fetch("/api/tenant/financial-period-locks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodKey: month.periodKey, locked: !month.locked }),
    });
    setBusyPeriodKey(null);
    await loadMonths();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financial Month Closing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sperrt Zeiteinträge, Ausgaben und Services abgeschlossener Kalendermonate gegen Änderungen, um die
          Genauigkeit exportierter Finanzdaten sicherzustellen.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={enabled} onCheckedChange={(c) => setEnabled(c === true)} disabled={!canManage} />
            Financial Month Closing aktivieren
          </label>
          {enabled && (
            <div className="flex flex-col gap-2">
              <Label>Closing Date (Tag im Monat, ab dem der Vormonat automatisch gesperrt wird)</Label>
              <Input
                className="w-24"
                type="number"
                min={1}
                max={31}
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                disabled={!canManage}
              />
            </div>
          )}
          {canManage && (
            <Button size="sm" className="self-start" onClick={handleSaveSettings} loading={saving}>
              Speichern
            </Button>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-base font-semibold">Month Overview</h2>
        <div className="flex flex-col gap-1.5">
          {months.map((month) => (
            <div key={month.periodKey} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="capitalize">{formatPeriodKey(month.periodKey)}</span>
                {month.locked ? (
                  <Badge variant="outline">Gesperrt{month.isOverride ? " (manuell)" : ""}</Badge>
                ) : (
                  <Badge variant="outline">Offen</Badge>
                )}
                {month.lockedByLabel && <span className="text-xs text-muted-foreground">von {month.lockedByLabel}</span>}
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMonth(month)}
                  loading={busyPeriodKey === month.periodKey}
                  title={month.locked ? "Entsperren" : "Sperren"}
                >
                  {month.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
