"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTenantPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subdomain }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Provisionierung fehlgeschlagen.");
        return;
      }

      router.push("/tenants");
      router.refresh();
    } catch {
      setError("Netzwerkfehler beim Anlegen des Tenants.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "420px" }}>
      <h1>Neuer Tenant</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          Subdomain
          <input
            type="text"
            value={subdomain}
            onChange={(event) => setSubdomain(event.target.value.toLowerCase())}
            required
            placeholder="kunde"
            style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>
        {error && <p style={{ color: "#c53030" }}>{error}</p>}
        <button type="submit" disabled={submitting} style={{ padding: "0.5rem 1rem" }}>
          {submitting ? "Wird angelegt…" : "Tenant anlegen"}
        </button>
      </form>
    </main>
  );
}
