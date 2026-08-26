"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/ui/shell/AdminShell";

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
      <AdminShell>
        <div className="container" style={{ maxWidth: "480px" }}>
          <h1>Tenant angelegt</h1>
          <p className="text-muted" style={{ margin: "var(--space-3) 0" }}>
            Teile diesen Einladungslink mit dem Kunden, um den ersten Zugang einzurichten:
          </p>
          <div className="card" style={{ wordBreak: "break-all" }}>
            <code className="coord" style={{ fontSize: "var(--text-sm)" }}>
              {inviteUrl}
            </code>
          </div>
          <Link href="/tenants" className="btn btn-secondary" style={{ marginTop: "var(--space-5)" }}>
            Zur Tenant-Liste
          </Link>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="container" style={{ maxWidth: "420px" }}>
        <h1 style={{ marginBottom: "var(--space-6)" }}>Neuer Tenant</h1>
        <form onSubmit={handleSubmit} className="stack" style={{ gap: "var(--space-5)" }}>
          <div className="field">
            <label className="field-label" htmlFor="tenant-name">
              Name
            </label>
            <input
              id="tenant-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="input"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tenant-subdomain">
              Subdomain
            </label>
            <input
              id="tenant-subdomain"
              type="text"
              value={subdomain}
              onChange={(event) => setSubdomain(event.target.value.toLowerCase())}
              required
              placeholder="kunde"
              className="input"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tenant-owner-email">
              Owner-E-Mail
            </label>
            <input
              id="tenant-owner-email"
              type="email"
              value={ownerEmail}
              onChange={(event) => setOwnerEmail(event.target.value)}
              required
              placeholder="person@kunde.de"
              className="input"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tenant-plan">
              Lizenzart
            </label>
            <select
              id="tenant-plan"
              className="select"
              value={plan}
              onChange={(event) => {
                const nextPlan = event.target.value as "small" | "medium" | "enterprise";
                setPlan(nextPlan);
                if (nextPlan !== "enterprise" && tier === "dedicated") {
                  setTier("shared");
                }
              }}
            >
              <option value="small">Klein</option>
              <option value="medium">Mittelstand</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <p className="field-hint">
              Klein: Kernmodule. Mittelstand: + Budgets/Financials, Cycles, Automations, Client-Portal,
              2FA/SCIM u. a. Enterprise: + Portfolios, Baseline-Diffing, Slack-Capture, dedizierte
              Infrastruktur.
            </p>
          </div>
          {plan === "small" && (
            <label className="row" style={{ gap: "var(--space-3)", fontSize: "var(--text-sm)" }}>
              <input
                type="checkbox"
                checked={twoFactorAddOn}
                onChange={(event) => setTwoFactorAddOn(event.target.checked)}
              />
              2FA/SCIM als Zusatzbuchung aktivieren
            </label>
          )}
          <div className="field">
            <label className="field-label" htmlFor="tenant-tier">
              Infrastruktur
            </label>
            <select
              id="tenant-tier"
              className="select"
              value={tier}
              disabled={plan !== "enterprise"}
              onChange={(event) => setTier(event.target.value as "shared" | "dedicated")}
            >
              <option value="shared">Geteilt (Standard)</option>
              <option value="dedicated" disabled={plan !== "enterprise"}>
                Dediziert (eigener DB-Server) — nur Enterprise
              </option>
            </select>
          </div>
          {tier === "dedicated" && (
            <div className="field">
              <label className="field-label" htmlFor="tenant-target-connection">
                Ziel-Connection-String
              </label>
              <input
                id="tenant-target-connection"
                type="text"
                value={targetConnectionString}
                onChange={(event) => setTargetConnectionString(event.target.value)}
                required
                placeholder="postgresql://user:pass@host:5432/postgres"
                className="input"
              />
              <p className="field-hint">Zeigt auf die Admin-Verbindung des dedizierten Servers.</p>
            </div>
          )}
          {error && <p className="field-error">{error}</p>}
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Wird angelegt…" : "Tenant anlegen"}
          </button>
        </form>
      </div>
    </AdminShell>
  );
}
