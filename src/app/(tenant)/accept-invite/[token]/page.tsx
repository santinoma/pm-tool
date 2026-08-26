"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/tenant/invites/${params.token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Einladung konnte nicht angenommen werden.");
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-wordmark">
          PM<span>·</span>Atlas
        </div>
        <h1 style={{ marginBottom: "var(--space-1)" }}>Einladung annehmen</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
          Richte dein Konto ein, um loszulegen.
        </p>
        <form onSubmit={handleSubmit} className="stack" style={{ gap: "var(--space-5)" }}>
          <div className="field">
            <label className="field-label" htmlFor="invite-name">
              Name
            </label>
            <input
              id="invite-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="input"
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="invite-password">
              Passwort
            </label>
            <input
              id="invite-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="input"
            />
            <span className="field-hint">Mindestens 8 Zeichen.</span>
          </div>
          {error && <p className="field-error">{error}</p>}
          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%" }}>
            {submitting ? "Wird angelegt…" : "Konto einrichten"}
          </button>
        </form>
      </div>
    </div>
  );
}
