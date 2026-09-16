"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

interface ProjectOption {
  id: string;
  name: string;
  tasks: { id: string; title: string }[];
}

interface MatrixEntry {
  id: string;
  label: string;
  durationMinutes: number;
  date: string;
  taskId: string | null;
  projectId: string | null;
}

interface Row {
  key: string;
  label: string;
  target: { taskId: string } | { projectId: string };
}

function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as the first day
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Reference §03: "Klick → Stunden tippen (HH:MM oder Dezimal)." Accepts
// either "2:30" or "2.5"/"2,5"; returns null for anything else.
function parseHoursInput(raw: string): number | null {
  const trimmed = raw.trim();
  const hhmm = trimmed.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (hhmm) {
    return Number(hhmm[1]) + Number(hhmm[2]) / 60;
  }
  const decimal = Number(trimmed.replace(",", "."));
  return Number.isFinite(decimal) ? decimal : null;
}

function formatHours(minutes: number): string {
  if (minutes === 0) return "–";
  return (minutes / 60).toFixed(2).replace(/\.00$/, "");
}

// Reference §03 (Time — Timesheet-Matrix): rows are "Services" (Projekt →
// Budget → Workstream → Service). This app doesn't model Services outside
// the (plan-gated) budgeting feature, so rows are Tasks (falling back to
// Project when an entry has no task) — the same row-per-target ×
// weekday-column × cell-hours mechanic, on data every plan has. Task rows
// (not project rows) also sidestep the `allowProjectLevelTimeEntries`
// tenant setting: booking against a task is always allowed, so most rows
// stay editable regardless of that policy.
export function TimesheetMatrixClient({
  projects,
  entries,
  allowProjectLevelTimeEntries,
}: {
  projects: ProjectOption[];
  entries: MatrixEntry[];
  allowProjectLevelTimeEntries: boolean;
}) {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date());
    base.setUTCDate(base.getUTCDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const d = new Date(weekStart);
        d.setUTCDate(d.getUTCDate() + index);
        return d;
      }),
    [weekStart],
  );

  const taskLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) {
      for (const task of project.tasks) map.set(task.id, `${project.name} · ${task.title}`);
    }
    return map;
  }, [projects]);

  const projectNameById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

  function rowKeyFor(entry: MatrixEntry): string | null {
    if (entry.taskId) return `task:${entry.taskId}`;
    if (entry.projectId) return `project:${entry.projectId}`;
    return null;
  }

  // Rows: every task/project the user has booked time against in the
  // fetched history — mirrors the reference's Pinned/Scheduled/Recent row
  // sourcing loosely ("Recent" = has any entry at all in the fetched
  // history; this app has no separate pin/schedule concept for time rows).
  const rows = useMemo(() => {
    const seen = new Map<string, Row>();
    for (const entry of entries) {
      const key = rowKeyFor(entry);
      if (!key || seen.has(key)) continue;
      if (entry.taskId) {
        seen.set(key, { key, label: taskLabelById.get(entry.taskId) ?? entry.label, target: { taskId: entry.taskId } });
      } else if (entry.projectId) {
        seen.set(key, { key, label: projectNameById.get(entry.projectId) ?? entry.label, target: { projectId: entry.projectId } });
      }
    }
    return Array.from(seen.values());
     
  }, [entries, taskLabelById, projectNameById]);

  const cellMinutes = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      const key = rowKeyFor(entry);
      if (!key) continue;
      const dateKey = entry.date.slice(0, 10);
      const cellKey = `${key}:${dateKey}`;
      map.set(cellKey, (map.get(cellKey) ?? 0) + entry.durationMinutes);
    }
    return map;
     
  }, [entries]);

  const dayTotals = weekDays.map((day) => {
    const dateKey = isoDate(day);
    return rows.reduce((sum, row) => sum + (cellMinutes.get(`${row.key}:${dateKey}`) ?? 0), 0);
  });
  const weekTotal = dayTotals.reduce((sum, m) => sum + m, 0);

  async function handleSaveCell(row: Row, dateKey: string) {
    const hours = parseHoursInput(cellValue);
    if (hours === null || hours <= 0) {
      setEditingCell(null);
      return;
    }
    setSaving(true);
    setSaveError(null);
    const response = await fetch("/api/tenant/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...row.target, durationMinutes: Math.round(hours * 60), date: dateKey }),
    });
    setSaving(false);
    setEditingCell(null);
    setCellValue("");
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setSaveError(body.error ?? "Eintrag konnte nicht gespeichert werden.");
      return;
    }
    router.refresh();
  }

  const hasProjectOnlyRow = rows.some((row) => "projectId" in row.target);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
            ‹
          </Button>
          <span className="font-mono text-sm text-muted-foreground">
            {weekDays[0].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} –{" "}
            {weekDays[6].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
            ›
          </Button>
          {weekOffset !== 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
              Heute
            </Button>
          )}
        </div>
      </div>

      {saveError && <p className="mb-3 text-sm text-destructive">{saveError}</p>}
      {!allowProjectLevelTimeEntries && hasProjectOnlyRow && (
        <p className="mb-3 text-xs text-muted-foreground">
          Zeilen ohne Task-Bezug sind nur lesbar — dieser Tenant erlaubt keine Zeitbuchung direkt auf Projektebene
          (Settings → Zeiterfassung).
        </p>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border py-10 text-center text-sm text-muted-foreground">
          Noch keine Einträge — trag zuerst über &bdquo;Manueller Eintrag&ldquo; unten Zeit auf einem Projekt/Task ein, dann
          erscheint es hier als Zeile.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                {weekDays.map((day) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <TableHead key={day.toISOString()} className={cn("text-center", isToday && "bg-primary/10 text-primary")}>
                      {day.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit" })}
                    </TableHead>
                  );
                })}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const rowTotal = weekDays.reduce((sum, day) => sum + (cellMinutes.get(`${row.key}:${isoDate(day)}`) ?? 0), 0);
                const rowEditable = "taskId" in row.target || allowProjectLevelTimeEntries;
                return (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    {weekDays.map((day) => {
                      const dateKey = isoDate(day);
                      const cellKey = `${row.key}:${dateKey}`;
                      const minutes = cellMinutes.get(cellKey) ?? 0;
                      const isEditing = editingCell === cellKey;
                      return (
                        <TableCell key={cellKey} className="p-1 text-center">
                          {isEditing ? (
                            <Input
                              autoFocus
                              value={cellValue}
                              onChange={(event) => setCellValue(event.target.value)}
                              onBlur={() => handleSaveCell(row, dateKey)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") handleSaveCell(row, dateKey);
                                if (event.key === "Escape") setEditingCell(null);
                              }}
                              placeholder="HH:MM"
                              disabled={saving}
                              className="h-8 w-16 text-center font-mono text-xs"
                            />
                          ) : rowEditable ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCell(cellKey);
                                setCellValue("");
                              }}
                              className="h-8 w-16 rounded font-mono text-xs tabular-nums text-muted-foreground hover:bg-muted"
                              title="Klicken, um Stunden hinzuzufügen"
                            >
                              {formatHours(minutes)}
                            </button>
                          ) : (
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatHours(minutes)}</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">{formatHours(rowTotal)}h</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell className="text-xs font-semibold tracking-wide uppercase">Weekly summary</TableCell>
                {dayTotals.map((minutes, index) => (
                  <TableCell key={weekDays[index].toISOString()} className="text-center font-mono text-xs font-semibold tabular-nums">
                    {formatHours(minutes)}
                  </TableCell>
                ))}
                <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">{formatHours(weekTotal)}h</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
