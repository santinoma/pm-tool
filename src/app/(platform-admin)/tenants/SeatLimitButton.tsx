"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/shadcn/components/dialog";
import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";

export function SeatLimitDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  seatLimit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  seatLimit: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(seatLimit === null ? "" : String(seatLimit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const trimmed = value.trim();
    const nextSeatLimit = trimmed === "" ? null : Number(trimmed);
    const response = await fetch(`/api/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatLimit: nextSeatLimit }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Sitzplatz-Limit konnte nicht gespeichert werden.");
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sitzplatz-Limit für „{tenantName}“</DialogTitle>
          <DialogDescription>
            Maximale Anzahl bezahlter Sitzplätze (Owner/Admin/Member — die client-Rolle zählt nicht mit). Leer
            lassen für kein Limit.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seat-limit-input">Sitzplätze</Label>
          <Input
            id="seat-limit-input"
            type="number"
            min={0}
            step={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Kein Limit"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Abbrechen
            </Button>
          </DialogClose>
          <Button size="sm" onClick={handleSave} loading={saving}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
