"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Progress } from "@/ui/shadcn/components/progress";
import { ragVariantForUsagePercent } from "@/ui/nextelite/ragVariant";

interface Budget {
  budgetHours: number | null;
  budgetAmount: number | null;
  hourlyRate: number | null;
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  return `${amount.toFixed(2)} ${currency}`;
}

export function BudgetClient({
  projectId,
  canEdit,
  currency,
  budget,
  actualHours,
  actualAmount,
}: {
  projectId: string;
  canEdit: boolean;
  currency: string;
  budget: Budget;
  actualHours: number;
  actualAmount: number | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [budgetHours, setBudgetHours] = useState(budget.budgetHours?.toString() ?? "");
  const [budgetAmount, setBudgetAmount] = useState(budget.budgetAmount?.toString() ?? "");
  const [hourlyRate, setHourlyRate] = useState(budget.hourlyRate?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  function toNullableNumber(value: string): number | null {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/tenant/projects/${projectId}/budget`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budgetHours: toNullableNumber(budgetHours),
        budgetAmount: toNullableNumber(budgetAmount),
        hourlyRate: toNullableNumber(hourlyRate),
      }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  const hoursPercent = budget.budgetHours && budget.budgetHours > 0 ? (actualHours / budget.budgetHours) * 100 : null;
  const amountPercent =
    budget.budgetAmount && budget.budgetAmount > 0 && actualAmount !== null ? (actualAmount / budget.budgetAmount) * 100 : null;

  return (
    <div className="mx-auto max-w-xl pb-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Budget</h1>

      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span>Stunden</span>
              <span className="text-muted-foreground">
                {actualHours.toFixed(1)}h{budget.budgetHours !== null ? ` / ${budget.budgetHours}h` : ""}
              </span>
            </div>
            {hoursPercent !== null && <Progress value={Math.min(100, hoursPercent)} variant={ragVariantForUsagePercent(hoursPercent)} />}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span>Betrag</span>
              <span className="text-muted-foreground">
                {formatAmount(actualAmount, currency)}
                {budget.budgetAmount !== null ? ` / ${formatAmount(budget.budgetAmount, currency)}` : ""}
              </span>
            </div>
            {amountPercent !== null && <Progress value={Math.min(100, amountPercent)} variant={ragVariantForUsagePercent(amountPercent)} />}
          </div>
        </CardContent>
      </Card>

      {canEdit &&
        (editing ? (
          <div className="mt-6 flex max-w-xs flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Budget-Stunden</Label>
              <Input type="number" value={budgetHours} onChange={(event) => setBudgetHours(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Budget-Betrag ({currency})</Label>
              <Input type="number" value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Stundensatz ({currency})</Label>
              <Input type="number" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} loading={saving}>
                Speichern
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setEditing(true)} className="mt-6">
            Budget bearbeiten
          </Button>
        ))}
    </div>
  );
}
