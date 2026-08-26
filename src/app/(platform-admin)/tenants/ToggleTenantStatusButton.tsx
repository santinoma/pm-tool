"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ToggleTenantStatusButton({
  tenantId,
  tenantName,
  status,
}: {
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
    if (nextStatus === "disabled") {
      const confirmed = window.confirm(
        `Tenant "${tenantName}" wirklich deaktivieren? Der Zugriff wird gesperrt, die Daten bleiben erhalten.`,
      );
      if (!confirmed) return;
    }

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
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={handleToggle} className="btn btn-secondary btn-sm" disabled={saving}>
        {saving ? "Wird gespeichert…" : actionLabel}
      </button>
      {error && <p className="field-error">{error}</p>}
    </>
  );
}
