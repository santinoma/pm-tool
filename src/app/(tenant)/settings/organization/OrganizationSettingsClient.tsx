"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

export function OrganizationSettingsClient({
  currency,
  triageEnabled,
  require2fa,
  scimBearerToken,
}: {
  currency: string;
  triageEnabled: boolean;
  require2fa: boolean;
  scimBearerToken: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currency);
  const [triage, setTriage] = useState(triageEnabled);
  const [twoFa, setTwoFa] = useState(require2fa);
  const [token, setToken] = useState(scimBearerToken);
  const [saving, setSaving] = useState(false);

  async function patchSettings(data: Record<string, unknown>) {
    setSaving(true);
    await fetch("/api/tenant/tenant-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleCurrencyChange(nextValue: string) {
    setValue(nextValue);
    await patchSettings({ currency: nextValue });
  }

  async function handleTriageChange(nextChecked: boolean) {
    setTriage(nextChecked);
    await patchSettings({ triageEnabled: nextChecked });
  }

  async function handleTwoFaChange(nextChecked: boolean) {
    setTwoFa(nextChecked);
    await patchSettings({ require2fa: nextChecked });
  }

  async function handleGenerateScimToken() {
    setSaving(true);
    const response = await fetch("/api/tenant/organization/scim-token", { method: "POST" });
    setSaving(false);
    if (response.ok) {
      const data = await response.json();
      setToken(data.scimBearerToken);
    }
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "480px" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Organisation</h1>
      <div className="field" style={{ maxWidth: "200px", marginBottom: "var(--space-6)" }}>
        <label className="field-label" htmlFor="org-currency">
          Währung
        </label>
        <select
          id="org-currency"
          className="select"
          value={value}
          disabled={saving}
          onChange={(event) => handleCurrencyChange(event.target.value)}
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      <label className="row" style={{ gap: "var(--space-3)", fontSize: "var(--text-sm)", marginBottom: "var(--space-8)" }}>
        <input
          type="checkbox"
          checked={triage}
          disabled={saving}
          onChange={(event) => handleTriageChange(event.target.checked)}
        />
        Neue Tasks zuerst in die Triage stellen, statt sie direkt ins Projekt zu übernehmen
      </label>

      <h2 style={{ marginBottom: "var(--space-3)" }}>Sicherheit</h2>
      <label className="row" style={{ gap: "var(--space-3)", fontSize: "var(--text-sm)", marginBottom: "var(--space-8)" }}>
        <input
          type="checkbox"
          checked={twoFa}
          disabled={saving}
          onChange={(event) => handleTwoFaChange(event.target.checked)}
        />
        Zwei-Faktor-Authentifizierung für alle Mitglieder erzwingen
      </label>

      <h2 style={{ marginBottom: "var(--space-3)" }}>SCIM-Provisionierung</h2>
      {token ? (
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <p className="field-hint" style={{ marginBottom: "var(--space-2)" }}>
            Bearer-Token für euren Identity Provider:
          </p>
          <code className="coord" style={{ wordBreak: "break-all" }}>{token}</code>
        </div>
      ) : (
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>
          Noch kein SCIM-Token erzeugt.
        </p>
      )}
      <button type="button" onClick={handleGenerateScimToken} className="btn btn-secondary" disabled={saving}>
        {token ? "Token neu generieren" : "Token generieren"}
      </button>
    </div>
  );
}
