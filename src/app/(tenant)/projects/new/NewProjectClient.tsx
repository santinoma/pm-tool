"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewProjectClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/tenant/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Projekt konnte nicht angelegt werden.");
        return;
      }

      router.push(`/projects/${data.project.id}/list`);
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: "420px" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Neues Projekt</h1>
      <form onSubmit={handleSubmit} className="stack" style={{ gap: "var(--space-5)" }}>
        <div className="field">
          <label className="field-label" htmlFor="project-name">
            Name
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="input"
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="project-description">
            Beschreibung (optional)
          </label>
          <textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="textarea"
          />
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? "Wird angelegt…" : "Projekt anlegen"}
        </button>
      </form>
    </div>
  );
}
