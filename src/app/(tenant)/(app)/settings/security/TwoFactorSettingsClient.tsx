"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Input } from "@/ui/shadcn/components/input";

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
    <div>
      <h2 className="mb-3 text-lg font-semibold">Zwei-Faktor-Authentifizierung</h2>
      {totpEnabled ? (
        <p className="text-sm text-muted-foreground">2FA ist für dein Konto aktiviert.</p>
      ) : enrollment ? (
        <Card>
          <CardContent>
            <p className="mb-3 text-sm">
              Füge dieses Secret in deiner Authenticator-App hinzu (oder scanne den otpauth-Link):
            </p>
            <code className="mb-2 block font-mono text-sm break-all">{enrollment.secret}</code>
            <code className="mb-4 block font-mono text-xs break-all text-muted-foreground">{enrollment.otpauthUri}</code>
            <form onSubmit={handleVerify} className="flex items-center gap-3">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="6-stelliger Code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                className="w-40"
              />
              <Button type="submit" disabled={saving}>
                Bestätigen
              </Button>
            </form>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">2FA ist noch nicht aktiviert.</p>
          <Button type="button" onClick={handleStartEnrollment}>
            2FA einrichten
          </Button>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
