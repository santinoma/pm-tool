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

export function ToggleTenantStatusDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  status,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  status: "active" | "disabled";
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextStatus = status === "active" ? "disabled" : "active";
  const actionLabel = status === "active" ? "Deaktivieren" : "Aktivieren";

  async function handleToggle() {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Status konnte nicht geändert werden.");
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tenant {actionLabel.toLowerCase()}</DialogTitle>
          <DialogDescription>
            {nextStatus === "disabled"
              ? `Tenant „${tenantName}“ wirklich deaktivieren? Der Zugriff wird gesperrt, die Daten bleiben erhalten.`
              : `Tenant „${tenantName}“ wieder aktivieren?`}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Abbrechen
            </Button>
          </DialogClose>
          <Button size="sm" onClick={handleToggle} loading={saving}>
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
