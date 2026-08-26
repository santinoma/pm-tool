"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface WikiPage {
  id: string;
  title: string;
  content: string;
}

export function WikiPageClient({
  projectId,
  page,
  contentHtml,
}: {
  projectId: string;
  page: WikiPage;
  contentHtml: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const response = await fetch(`/api/tenant/wiki/${page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    await fetch(`/api/tenant/wiki/${page.id}`, { method: "DELETE" });
    router.push(`/projects/${projectId}/wiki`);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="container" style={{ maxWidth: "700px" }}>
        <div className="stack" style={{ gap: "var(--space-4)" }}>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="input"
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={16}
            className="textarea"
            style={{ fontFamily: "var(--font-mono)" }}
          />
          {error && <p className="field-error">{error}</p>}
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <button type="button" onClick={handleSave} className="btn btn-primary">
              Speichern
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost">
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "700px" }}>
      <h1 style={{ marginBottom: "var(--space-4)" }}>{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      <div className="row" style={{ gap: "var(--space-2)", marginTop: "var(--space-6)" }}>
        <button type="button" onClick={() => setEditing(true)} className="btn btn-secondary">
          Bearbeiten
        </button>
        <button type="button" onClick={handleDelete} className="btn btn-danger">
          Löschen
        </button>
      </div>
    </div>
  );
}
