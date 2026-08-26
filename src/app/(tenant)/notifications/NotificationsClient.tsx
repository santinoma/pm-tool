"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  summary: string;
  projectName: string;
  actor: string;
  createdAt: string;
  readAt: string | null;
}

interface ProjectPreference {
  id: string;
  name: string;
  level: string;
}

export function NotificationsClient({
  notifications,
  projects,
}: {
  notifications: NotificationItem[];
  projects: ProjectPreference[];
}) {
  const router = useRouter();
  const [levels, setLevels] = useState<Record<string, string>>(
    Object.fromEntries(projects.map((p) => [p.id, p.level])),
  );

  async function markRead(id: string) {
    await fetch(`/api/tenant/notifications/${id}/read`, { method: "PATCH" });
    router.refresh();
  }

  async function handleLevelChange(projectId: string, level: string) {
    setLevels((prev) => ({ ...prev, [projectId]: level }));
    await fetch(`/api/tenant/projects/${projectId}/notification-preference`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
  }

  return (
    <div className="container" style={{ maxWidth: "760px" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Benachrichtigungen</h1>

      {notifications.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: "var(--space-8)" }}>
          <h3>Keine Benachrichtigungen</h3>
          <p>Du bist auf dem aktuellen Stand.</p>
        </div>
      ) : (
        <ul className="list-plain" style={{ marginBottom: "var(--space-8)" }}>
          {notifications.map((notification) => (
            <li key={notification.id} style={{ display: "block", padding: "var(--space-3) 0" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span style={{ fontWeight: notification.readAt ? 400 : 700 }}>
                  <span className="coord" style={{ marginRight: "var(--space-2)" }}>
                    {notification.projectName}
                  </span>
                  {notification.summary}
                </span>
                <span className="text-faint" style={{ fontSize: "var(--text-xs)", flexShrink: 0 }}>
                  {new Date(notification.createdAt).toLocaleString("de-DE")}
                </span>
              </div>
              {!notification.readAt && (
                <button
                  type="button"
                  onClick={() => markRead(notification.id)}
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: "var(--space-1)" }}
                >
                  Als gelesen markieren
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ marginBottom: "var(--space-4)" }}>Benachrichtigungs-Einstellungen pro Projekt</h2>
      <div className="table-wrap">
        <table className="table">
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>
                  <select
                    className="select"
                    value={levels[project.id]}
                    onChange={(event) => handleLevelChange(project.id, event.target.value)}
                  >
                    <option value="all">Alles</option>
                    <option value="mentions">Nur Erwähnungen</option>
                    <option value="off">Aus</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
