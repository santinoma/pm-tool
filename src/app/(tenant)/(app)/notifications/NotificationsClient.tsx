"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { cn } from "@/ui/shadcn/lib/utils";

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
  const [levels, setLevels] = useState<Record<string, string>>(Object.fromEntries(projects.map((p) => [p.id, p.level])));

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
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Benachrichtigungen</h1>

      {notifications.length === 0 ? (
        <div className="mb-8 rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Keine Benachrichtigungen</h3>
          <p className="mt-1 text-sm text-muted-foreground">Du bist auf dem aktuellen Stand.</p>
        </div>
      ) : (
        <ul className="mb-8 flex flex-col gap-1">
          {notifications.map((notification) => (
            <li key={notification.id} className="border-b py-3 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <span className={cn("text-sm", !notification.readAt && "font-bold")}>
                  <span className="mr-2 text-xs text-muted-foreground">{notification.projectName}</span>
                  {notification.summary}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString("de-DE")}</span>
              </div>
              {!notification.readAt && (
                <Button variant="ghost" size="sm" onClick={() => markRead(notification.id)} className="mt-1">
                  Als gelesen markieren
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-4 text-lg font-semibold">Benachrichtigungs-Einstellungen pro Projekt</h2>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b last:border-0">
                <td className="p-3">{project.name}</td>
                <td className="p-3">
                  <Select value={levels[project.id]} onValueChange={(value) => handleLevelChange(project.id, value)}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alles</SelectItem>
                      <SelectItem value="mentions">Nur Erwähnungen</SelectItem>
                      <SelectItem value="off">Aus</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
