"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewWikiPageClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/tenant/projects/${projectId}/wiki`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Seite konnte nicht angelegt werden.");
      return;
    }
    router.push(`/projects/${projectId}/wiki/${data.page.id}`);
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "700px" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Neue Wiki-Seite</h1>
      <form onSubmit={handleSubmit} className="stack" style={{ gap: "var(--space-4)" }}>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titel"
          required
          className="input"
        />
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Inhalt (Markdown)"
          rows={12}
          className="textarea"
          style={{ fontFamily: "var(--font-mono)" }}
        />
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
          Anlegen
        </button>
      </form>
    </div>
  );
}
