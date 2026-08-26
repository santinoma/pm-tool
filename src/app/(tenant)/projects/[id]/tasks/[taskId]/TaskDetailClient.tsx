"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  statusId: string;
  assigneeId: string | null;
  blocking: { id: string; title: string }[];
  blockedBy: { id: string; title: string }[];
  customValues: { fieldId: string; label: string; value: string }[];
  comments: { id: string; body: string; author: string; createdAt: string }[];
  attachments: { id: string; filename: string; sizeBytes: number; uploadedBy: string }[];
}

export function TaskDetailClient({
  task,
  statuses,
  users,
}: {
  task: TaskDetail;
  statuses: { id: string; name: string }[];
  users: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function updateTask(data: Record<string, unknown>) {
    await fetch(`/api/tenant/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
  }

  async function handleCommentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/tenant/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Kommentar konnte nicht gespeichert werden.");
      return;
    }
    setCommentBody("");
    router.refresh();
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/tenant/tasks/${task.id}/attachments`, {
      method: "POST",
      body: formData,
    });
    setUploading(false);
    event.target.value = "";
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Upload fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "760px" }}>
      <h1 style={{ marginBottom: "var(--space-1)" }}>{task.title}</h1>
      {task.description && (
        <p className="text-muted" style={{ marginBottom: "var(--space-5)" }}>
          {task.description}
        </p>
      )}

      <div className="row" style={{ gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="field-label">Status</label>
          <select
            className="select"
            defaultValue={task.statusId}
            onChange={(event) => updateTask({ statusId: event.target.value })}
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label className="field-label">Assignee</label>
          <select
            className="select"
            defaultValue={task.assigneeId ?? ""}
            onChange={(event) => updateTask({ assigneeId: event.target.value || null })}
          >
            <option value="">— niemand —</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(task.blocking.length > 0 || task.blockedBy.length > 0) && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          {task.blocking.length > 0 && (
            <p style={{ fontSize: "var(--text-sm)" }}>
              <strong>Blockiert:</strong> {task.blocking.map((t) => t.title).join(", ")}
            </p>
          )}
          {task.blockedBy.length > 0 && (
            <p style={{ fontSize: "var(--text-sm)" }}>
              <strong>Blockiert durch:</strong> {task.blockedBy.map((t) => t.title).join(", ")}
            </p>
          )}
        </div>
      )}

      {task.customValues.length > 0 && (
        <div style={{ marginBottom: "var(--space-6)" }}>
          <h3 style={{ marginBottom: "var(--space-2)" }}>Custom Fields</h3>
          <ul className="list-plain">
            {task.customValues.map((value) => (
              <li key={value.fieldId}>
                <span className="text-muted">{value.label}</span>
                <span>{value.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="field-error" style={{ marginBottom: "var(--space-4)" }}>{error}</p>}

      <h2 style={{ marginBottom: "var(--space-3)" }}>Anhänge</h2>
      {task.attachments.length > 0 && (
        <ul className="list-plain" style={{ marginBottom: "var(--space-3)" }}>
          {task.attachments.map((attachment) => (
            <li key={attachment.id}>
              <a href={`/api/tenant/attachments/${attachment.id}/download`} style={{ fontWeight: 600 }}>
                {attachment.filename}
              </a>
              <span className="text-faint coord">
                {Math.round(attachment.sizeBytes / 1024)} KB · {attachment.uploadedBy}
              </span>
            </li>
          ))}
        </ul>
      )}
      <input type="file" onChange={handleFileUpload} disabled={uploading} />

      <h2 style={{ marginTop: "var(--space-8)", marginBottom: "var(--space-3)" }}>Kommentare</h2>
      <ul className="list-plain" style={{ marginBottom: "var(--space-4)" }}>
        {task.comments.map((comment) => (
          <li key={comment.id} style={{ display: "block" }}>
            <div className="row" style={{ gap: "var(--space-2)" }}>
              <strong>{comment.author}</strong>
              <span className="text-faint" style={{ fontSize: "var(--text-xs)" }}>
                {new Date(comment.createdAt).toLocaleString("de-DE")}
              </span>
            </div>
            <div style={{ fontSize: "var(--text-sm)" }}>{comment.body}</div>
          </li>
        ))}
      </ul>
      <form onSubmit={handleCommentSubmit} className="row" style={{ gap: "var(--space-2)" }}>
        <textarea
          value={commentBody}
          onChange={(event) => setCommentBody(event.target.value)}
          placeholder="Kommentar schreiben… @email erwähnt eine Person"
          required
          className="textarea"
          style={{ flex: 1, minHeight: "60px" }}
        />
        <button type="submit" className="btn btn-primary">
          Senden
        </button>
      </form>
    </div>
  );
}
