"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TimeTrackingSettingsClient({
  allowProjectLevelTimeEntries,
  timeTrackingMode,
}: {
  allowProjectLevelTimeEntries: boolean;
  timeTrackingMode: "timer" | "entries";
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(allowProjectLevelTimeEntries);
  const [mode, setMode] = useState(timeTrackingMode);
  const [saving, setSaving] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    await fetch("/api/tenant/tenant-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleModeChange(nextMode: "timer" | "entries") {
    setMode(nextMode);
    await patch({ timeTrackingMode: nextMode });
  }

  async function handleAllowChange(nextChecked: boolean) {
    setChecked(nextChecked);
    await patch({ allowProjectLevelTimeEntries: nextChecked });
  }

  return (
    <div className="container" style={{ maxWidth: "480px" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Zeiterfassung – Einstellungen</h1>

      <fieldset style={{ marginBottom: "var(--space-6)", border: "none", padding: 0 }}>
        <legend style={{ fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
          Art der Zeiterfassung
        </legend>
        <label className="row" style={{ gap: "var(--space-3)", fontSize: "var(--text-sm)", marginBottom: "var(--space-2)" }}>
          <input
            type="radio"
            name="timeTrackingMode"
            checked={mode === "timer"}
            disabled={saving}
            onChange={() => handleModeChange("timer")}
          />
          Zeituhr (starten &amp; stoppen)
        </label>
        <label className="row" style={{ gap: "var(--space-3)", fontSize: "var(--text-sm)" }}>
          <input
            type="radio"
            name="timeTrackingMode"
            checked={mode === "entries"}
            disabled={saving}
            onChange={() => handleModeChange("entries")}
          />
          Zeiteintragungen (Kalender, mit Service &amp; Stundensatz für Budgets)
        </label>
      </fieldset>

      <label className="row" style={{ gap: "var(--space-3)", fontSize: "var(--text-sm)" }}>
        <input
          type="checkbox"
          checked={checked}
          disabled={saving}
          onChange={(event) => handleAllowChange(event.target.checked)}
        />
        Zeitbuchung auch direkt auf Projektebene erlauben (ohne konkreten Task)
      </label>
    </div>
  );
}
