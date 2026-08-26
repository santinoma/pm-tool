"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteTenantButton({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Tenant "${tenantName}" wirklich löschen? Die Datenbank und alle Daten werden unwiderruflich gelöscht.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    const response = await fetch(`/api/tenants/${tenantId}`, { method: "DELETE" });
    setDeleting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Tenant konnte nicht gelöscht werden.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={handleDelete} className="btn btn-danger btn-sm" disabled={deleting}>
        {deleting ? "Wird gelöscht…" : "Löschen"}
      </button>
      {error && <p className="field-error">{error}</p>}
    </>
  );
}
