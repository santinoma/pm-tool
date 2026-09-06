"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

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
    <div>
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Organisation</h1>

      <div className="mb-6 max-w-[200px]">
        <Label htmlFor="org-currency" className="mb-2 block">
          Währung
        </Label>
        <Select value={value} onValueChange={handleCurrencyChange}>
          <SelectTrigger id="org-currency" disabled={saving} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Label className="mb-8 flex items-center gap-3 font-normal">
        <Checkbox checked={triage} disabled={saving} onCheckedChange={(v) => handleTriageChange(v === true)} />
        Neue Tasks zuerst in die Triage stellen, statt sie direkt ins Projekt zu übernehmen
      </Label>

      <h2 className="mb-3 text-lg font-semibold">Sicherheit</h2>
      <Label className="mb-8 flex items-center gap-3 font-normal">
        <Checkbox checked={twoFa} disabled={saving} onCheckedChange={(v) => handleTwoFaChange(v === true)} />
        Zwei-Faktor-Authentifizierung für alle Mitglieder erzwingen
      </Label>

      <h2 className="mb-3 text-lg font-semibold">SCIM-Provisionierung</h2>
      {token ? (
        <Card className="mb-4">
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">Bearer-Token für euren Identity Provider:</p>
            <code className="font-mono text-sm break-all">{token}</code>
          </CardContent>
        </Card>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">Noch kein SCIM-Token erzeugt.</p>
      )}
      <Button type="button" variant="outline" onClick={handleGenerateScimToken} disabled={saving}>
        {token ? "Token neu generieren" : "Token generieren"}
      </Button>
    </div>
  );
}
