"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthCard } from "@/ui/nextelite/AuthCard";
import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";

const SSO_ERROR_MESSAGES: Record<string, string> = {
  sso_not_configured: "Für diese Organisation ist noch kein SSO eingerichtet.",
  sso_invalid_response: "Die Antwort des Identity Providers konnte nicht überprüft werden.",
  sso_no_account: "Zu dieser E-Mail-Adresse existiert kein Konto in dieser Organisation.",
  sso_not_for_clients: "Clients melden sich per Passwort an, nicht über den SSO-Login dieser Organisation.",
};

export default function LoginPageClient({
  ssoEnabled,
  initialError,
}: {
  ssoEnabled: boolean;
  initialError: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingLoginId, setPendingLoginId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    initialError ? (SSO_ERROR_MESSAGES[initialError] ?? "Anmeldung fehlgeschlagen.") : null,
  );
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
      <AuthCard title="Zwei-Faktor-Code" description="Gib den 6-stelligen Code aus deiner Authenticator-App ein.">
        <form onSubmit={handleSubmit2fa} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-2fa-code">Code</Label>
            <Input
              id="login-2fa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" loading={submitting} className="w-full">
            {submitting ? "Wird geprüft…" : "Bestätigen"}
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Anmelden" description="Willkommen zurück. Melde dich mit deinem Konto an.">
      {ssoEnabled && (
        <Button asChild variant="outline" className="mb-5 w-full">
          <a href="/api/tenant/sso/login">Mit SSO anmelden</a>
        </Button>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="login-email">E-Mail</Label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="login-password">Passwort</Label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? "Wird angemeldet…" : "Anmelden"}
        </Button>
      </form>
    </AuthCard>
  );
}
