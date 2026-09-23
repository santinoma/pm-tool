"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

type NotificationLevel = "all" | "mentions" | "off";

interface ProjectPreference {
  id: string;
  name: string;
  level: NotificationLevel;
}

const LEVEL_LABELS: Record<NotificationLevel, string> = {
  all: "Alle Aktivitäten",
  mentions: "Nur Erwähnungen",
  off: "Aus",
};

export function NotificationSettingsClient({ projects }: { projects: ProjectPreference[] }) {
  const [levels, setLevels] = useState<Record<string, NotificationLevel>>(
    Object.fromEntries(projects.map((project) => [project.id, project.level])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleLevelChange(projectId: string, level: NotificationLevel) {
    setLevels((current) => ({ ...current, [projectId]: level }));
    setSavingId(projectId);
    await fetch(`/api/tenant/projects/${projectId}/notification-preference`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
    setSavingId(null);
  }

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Notifications</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Lege pro Projekt fest, über welche Aktivitäten (neue Tasks, Statusänderungen, Kommentare) du benachrichtigt
        wirst. Bei einer Erwähnung (@du) wirst du unabhängig von dieser Einstellung informiert.
      </p>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Du bist noch in keinem Projekt Mitglied.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 text-left">Projekt</th>
                <th className="px-4 py-2.5 text-left">Benachrichtigungen</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-t">
                  <td className="px-4 py-2.5 font-medium">{project.name}</td>
                  <td className="px-4 py-2.5">
                    <Select
                      value={levels[project.id]}
                      onValueChange={(next) => handleLevelChange(project.id, next as NotificationLevel)}
                    >
                      <SelectTrigger disabled={savingId === project.id} className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(LEVEL_LABELS) as NotificationLevel[]).map((level) => (
                          <SelectItem key={level} value={level}>
                            {LEVEL_LABELS[level]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
