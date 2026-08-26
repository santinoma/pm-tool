"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingLoginId, setPendingLoginId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/tenant/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Anmeldung fehlgeschlagen.");
        return;
      }

      if (data.requires2fa) {
        setPendingLoginId(data.pendingLoginId);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit2fa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/tenant/login/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingLoginId, code }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Code ungültig.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingLoginId) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-wordmark">
            PM<span>·</span>Atlas
          </div>
          <h1 style={{ marginBottom: "var(--space-1)" }}>Zwei-Faktor-Code</h1>
          <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
            Gib den 6-stelligen Code aus deiner Authenticator-App ein.
          </p>
          <form onSubmit={handleSubmit2fa} className="stack" style={{ gap: "var(--space-5)" }}>
            <div className="field">
              <label className="field-label" htmlFor="login-2fa-code">
                Code
              </label>
              <input
                id="login-2fa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                className="input"
                autoFocus
              />
            </div>
            {error && <p className="field-error">{error}</p>}
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%" }}>
              {submitting ? "Wird geprüft…" : "Bestätigen"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-wordmark">
          PM<span>·</span>Atlas
        </div>
        <h1 style={{ marginBottom: "var(--space-1)" }}>Anmelden</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
          Willkommen zurück. Melde dich mit deinem Konto an.
        </p>
        <form onSubmit={handleSubmit} className="stack" style={{ gap: "var(--space-5)" }}>
          <div className="field">
            <label className="field-label" htmlFor="login-email">
              E-Mail
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="input"
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="login-password">
              Passwort
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="input"
            />
          </div>
          {error && <p className="field-error">{error}</p>}
          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%" }}>
            {submitting ? "Wird angemeldet…" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
