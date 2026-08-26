"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TwoFactorSettingsClient({ totpEnabled }: { totpEnabled: boolean }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleStartEnrollment() {
    setError(null);
    const response = await fetch("/api/tenant/2fa/enroll", { method: "POST" });
    if (!response.ok) {
      setError("2FA-Setup konnte nicht gestartet werden.");
      return;
    }
    const data = await response.json();
    setEnrollment({ secret: data.secret, otpauthUri: data.otpauthUri });
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Code konnte nicht bestätigt werden.");
      return;
    }
    setEnrollment(null);
    setCode("");
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "480px" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Security</h1>

      <h2 style={{ marginBottom: "var(--space-3)" }}>Zwei-Faktor-Authentifizierung</h2>
      {totpEnabled ? (
        <p className="text-muted">2FA ist für dein Konto aktiviert.</p>
      ) : enrollment ? (
        <div className="card">
          <p style={{ marginBottom: "var(--space-3)" }}>
            Füge dieses Secret in deiner Authenticator-App hinzu (oder scanne den otpauth-Link):
          </p>
          <code className="coord" style={{ display: "block", marginBottom: "var(--space-2)", wordBreak: "break-all" }}>
            {enrollment.secret}
          </code>
          <code className="coord text-muted" style={{ display: "block", fontSize: "var(--text-xs)", marginBottom: "var(--space-4)", wordBreak: "break-all" }}>
            {enrollment.otpauthUri}
          </code>
          <form onSubmit={handleVerify} className="row" style={{ gap: "var(--space-3)" }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="6-stelliger Code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              className="input"
              style={{ width: "160px" }}
            />
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Bestätigen
            </button>
          </form>
          {error && <p className="field-error" style={{ marginTop: "var(--space-3)" }}>{error}</p>}
        </div>
      ) : (
        <>
          <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>
            2FA ist noch nicht aktiviert.
          </p>
          <button type="button" onClick={handleStartEnrollment} className="btn btn-primary">
            2FA einrichten
          </button>
          {error && <p className="field-error" style={{ marginTop: "var(--space-3)" }}>{error}</p>}
        </>
      )}
    </div>
  );
}
