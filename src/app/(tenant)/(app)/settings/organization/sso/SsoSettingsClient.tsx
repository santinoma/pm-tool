"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Textarea } from "@/ui/shadcn/components/textarea";

interface SsoConfigData {
  provider: string;
  entryPoint: string;
  issuer: string;
  cert: string;
  enabled: boolean;
  enforceSso: boolean;
}

const PROVIDERS = [
  { value: "google", label: "Google Workspace" },
  { value: "okta", label: "Okta" },
  { value: "entra", label: "Microsoft Entra ID" },
  { value: "generic", label: "Generisch (SAML 2.0)" },
];

export function SsoSettingsClient({
  config,
  metadataUrl,
  acsUrl,
}: {
  config: SsoConfigData | null;
  metadataUrl: string;
  acsUrl: string;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState(config?.provider ?? "generic");
  const [entryPoint, setEntryPoint] = useState(config?.entryPoint ?? "");
  const [issuer, setIssuer] = useState(config?.issuer ?? "");
  const [cert, setCert] = useState(config?.cert ?? "");
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [enforceSso, setEnforceSso] = useState(config?.enforceSso ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/sso-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, entryPoint, issuer, cert, enabled }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "SSO-Konfiguration konnte nicht gespeichert werden.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function handleToggleEnforce(next: boolean) {
    if (next) {
      const confirmed = window.confirm(
        "SSO erzwingen sperrt den Passwort-Login für alle Mitglieder außer Clients. Fortfahren?",
      );
      if (!confirmed) return;
    }
    setError(null);
    const response = await fetch("/api/tenant/sso-config/enforce", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enforceSso: next }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Konnte 'SSO erzwingen' nicht ändern.");
      return;
    }
    setEnforceSso(next);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Single Sign-On (SAML)</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Verbinde diese Organisation mit einem Identity Provider (SAML 2.0). Nutzer melden sich über den IdP an; die
        E-Mail-Adresse der SAML-Assertion muss mit einem bestehenden Konto übereinstimmen — SSO legt keine neuen
        Nutzer an (das übernimmt SCIM).
      </p>

      <Card className="mb-6">
        <CardContent>
          <h2 className="mb-3 text-base font-semibold">Für deinen Identity Provider</h2>
          <div className="mb-3">
            <Label className="mb-2 block">SP-Metadaten-URL (Entity ID)</Label>
            <Input readOnly value={metadataUrl} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
          </div>
          <div>
            <Label className="mb-2 block">ACS-URL (Assertion Consumer Service)</Label>
            <Input readOnly value={acsUrl} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div>
          <Label htmlFor="sso-provider" className="mb-2 block">
            Provider
          </Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger id="sso-provider" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="sso-entrypoint" className="mb-2 block">
            IdP SSO-URL (entryPoint)
          </Label>
          <Input
            id="sso-entrypoint"
            value={entryPoint}
            onChange={(event) => setEntryPoint(event.target.value)}
            placeholder="https://idp.example.com/sso/saml"
            required
          />
        </div>
        <div>
          <Label htmlFor="sso-issuer" className="mb-2 block">
            IdP Entity ID (issuer)
          </Label>
          <Input
            id="sso-issuer"
            value={issuer}
            onChange={(event) => setIssuer(event.target.value)}
            placeholder="https://idp.example.com/metadata"
            required
          />
        </div>
        <div>
          <Label htmlFor="sso-cert" className="mb-2 block">
            IdP-Zertifikat (PEM)
          </Label>
          <Textarea
            id="sso-cert"
            rows={8}
            value={cert}
            onChange={(event) => setCert(event.target.value)}
            placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
            required
            className="font-mono text-xs"
          />
        </div>
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} />
          Aktivieren
        </Label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={saving} className="self-start">
          {saving ? "Wird gespeichert…" : "Speichern"}
        </Button>
        {saved && <p className="text-sm text-muted-foreground">Gespeichert.</p>}
      </form>

      <Card className="mt-6">
        <CardContent>
          <h2 className="mb-2 text-base font-semibold">SSO erzwingen</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Sperrt den Passwort-Login für alle Mitglieder außer Clients — teste SSO also zuerst, bevor du diese
            Option aktivierst. Clients melden sich immer per Passwort an, unabhängig von dieser Einstellung.
          </p>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={enforceSso} onCheckedChange={(v) => handleToggleEnforce(v === true)} />
            SSO erzwingen
          </Label>
        </CardContent>
      </Card>
    </div>
  );
}
