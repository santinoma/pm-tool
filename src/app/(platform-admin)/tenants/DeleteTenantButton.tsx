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

export function DeleteTenantDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const response = await fetch(`/api/tenants/${tenantId}`, { method: "DELETE" });
    setDeleting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Tenant konnte nicht gelöscht werden.");
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tenant löschen</DialogTitle>
          <DialogDescription>
            Tenant „{tenantName}“ wirklich löschen? Die Datenbank und alle Daten werden unwiderruflich gelöscht.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Abbrechen
            </Button>
          </DialogClose>
          <Button variant="destructive" size="sm" onClick={handleDelete} loading={deleting}>
            Löschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
