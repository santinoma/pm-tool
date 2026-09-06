"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

import { AuthCard } from "@/ui/nextelite/AuthCard";
import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";

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
    <AuthCard title="Einladung annehmen" description="Richte dein Konto ein, um loszulegen.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-name">Name</Label>
          <Input id="invite-name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-password">Passwort</Label>
          <Input
            id="invite-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
          <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen.</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? "Wird angelegt…" : "Konto einrichten"}
        </Button>
      </form>
    </AuthCard>
  );
}
