"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";

import { AdminShellNextElite } from "@/ui/nextelite/AdminShellNextElite";
import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { ToggleGroup, ToggleGroupItem } from "@/ui/shadcn/components/toggle-group";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable — no-op, user can still select the text manually
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="text-success" /> : <Copy />}
      {copied ? "Kopiert" : "Kopieren"}
    </Button>
  );
}

export default function NewTenantPage() {
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [plan, setPlan] = useState<"small" | "medium" | "enterprise">("small");
  const [twoFactorAddOn, setTwoFactorAddOn] = useState(false);
  const [tier, setTier] = useState<"shared" | "dedicated">("shared");
  const [targetConnectionString, setTargetConnectionString] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subdomain,
          ownerEmail,
          plan,
          addOnFeatures: plan === "small" && twoFactorAddOn ? ["two_factor_scim"] : [],
          targetConnectionString: tier === "dedicated" ? targetConnectionString : undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Provisionierung fehlgeschlagen.");
        return;
      }

      setInviteUrl(data.inviteUrl ?? null);
    } catch {
      setError("Netzwerkfehler beim Anlegen des Tenants.");
    } finally {
      setSubmitting(false);
    }
  }

  if (inviteUrl) {
    return (
      <AdminShellNextElite>
        <div className="max-w-lg py-8">
          <div className="mb-1.5 text-xs font-semibold tracking-wide text-primary uppercase">Plattform</div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant angelegt</h1>
          <p className="mt-2.5 mb-5 text-sm text-muted-foreground">
            Teile diesen Einladungslink mit dem Kunden, um den ersten Zugang einzurichten:
          </p>
          <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
            <code className="flex-1 text-sm break-all text-muted-foreground">{inviteUrl}</code>
            <CopyButton value={inviteUrl} />
          </div>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/tenants">Zur Tenant-Liste</Link>
          </Button>
        </div>
      </AdminShellNextElite>
    );
  }

  return (
    <AdminShellNextElite>
      <div className="max-w-md py-8">
        <div className="mb-1.5 text-xs font-semibold tracking-wide text-primary uppercase">Plattform</div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Neuer Tenant</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-lg border bg-card p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tenant-name">Name</Label>
            <Input id="tenant-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tenant-subdomain">Subdomain</Label>
            <Input
              id="tenant-subdomain"
              value={subdomain}
              onChange={(event) => setSubdomain(event.target.value.toLowerCase())}
              required
              placeholder="kunde"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tenant-owner-email">Owner-E-Mail</Label>
            <Input
              id="tenant-owner-email"
              type="email"
              value={ownerEmail}
              onChange={(event) => setOwnerEmail(event.target.value)}
              required
              placeholder="person@kunde.de"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label id="tenant-plan-label">Lizenzart</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={plan}
              onValueChange={(value) => {
                if (!value) return;
                const nextPlan = value as "small" | "medium" | "enterprise";
                setPlan(nextPlan);
                if (nextPlan !== "enterprise" && tier === "dedicated") {
                  setTier("shared");
                }
              }}
              aria-labelledby="tenant-plan-label"
              className="w-full"
            >
              <ToggleGroupItem value="small">Klein</ToggleGroupItem>
              <ToggleGroupItem value="medium">Mittelstand</ToggleGroupItem>
              <ToggleGroupItem value="enterprise">Enterprise</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              Klein: Kernmodule. Mittelstand: + Budgets/Financials, Cycles, Automations, Client-Portal, 2FA/SCIM u. a.
              Enterprise: + Portfolios, Baseline-Diffing, Slack-Capture, dedizierte Infrastruktur.
            </p>
          </div>

          {plan === "small" && (
            <label className="flex items-center gap-2.5 text-sm font-medium text-foreground/80">
              <input
                type="checkbox"
                checked={twoFactorAddOn}
                onChange={(event) => setTwoFactorAddOn(event.target.checked)}
                className="size-4 accent-primary"
              />
              2FA/SCIM als Zusatzbuchung aktivieren
            </label>
          )}

          <div className="flex flex-col gap-2">
            <Label id="tenant-tier-label">Infrastruktur</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={tier}
              onValueChange={(value) => value && setTier(value as "shared" | "dedicated")}
              aria-labelledby="tenant-tier-label"
              className="w-full"
            >
              <ToggleGroupItem value="shared">Geteilt (Standard)</ToggleGroupItem>
              <ToggleGroupItem value="dedicated" disabled={plan !== "enterprise"}>
                Dediziert
              </ToggleGroupItem>
            </ToggleGroup>
            {plan !== "enterprise" && (
              <p className="text-xs text-muted-foreground">
                Dedizierte Infrastruktur (eigener DB-Server) ist nur für Enterprise verfügbar.
              </p>
            )}
          </div>

          {tier === "dedicated" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="tenant-target-connection">Ziel-Connection-String</Label>
              <Input
                id="tenant-target-connection"
                value={targetConnectionString}
                onChange={(event) => setTargetConnectionString(event.target.value)}
                required
                placeholder="postgresql://user:pass@host:5432/postgres"
              />
              <p className="text-xs text-muted-foreground">Zeigt auf die Admin-Verbindung des dedizierten Servers.</p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" loading={submitting}>
            {submitting ? "Wird angelegt…" : "Tenant anlegen"}
          </Button>
        </form>
      </div>
    </AdminShellNextElite>
  );
}
