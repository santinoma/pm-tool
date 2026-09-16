"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/shadcn/components/tabs";
import { TimesheetMatrixClient } from "./TimesheetMatrixClient";

interface ProjectOption {
  id: string;
  name: string;
  tasks: { id: string; title: string }[];
}

interface EntryRow {
  id: string;
  label: string;
  durationMinutes: number;
  description: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  locked: boolean;
  date: string;
  taskId: string | null;
  projectId: string | null;
}

interface PendingEntryRow {
  id: string;
  userLabel: string;
  label: string;
  durationMinutes: number;
  description: string | null;
}

interface UserOption {
  id: string;
  label: string;
}

interface RunningEntry {
  id: string;
  startedAt: string;
  label: string;
}

const APPROVAL_LABEL: Record<EntryRow["approvalStatus"], string> = {
  pending: "Ausstehend",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
};

const APPROVAL_BADGE_VARIANT: Record<EntryRow["approvalStatus"], "warningOutline" | "successOutline" | "destructiveOutline"> = {
  pending: "warningOutline",
  approved: "successOutline",
  rejected: "destructiveOutline",
};

function formatElapsed(startedAt: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function TimeTrackingClient({
  allowProjectLevelTimeEntries,
  isPrivileged,
  runningEntry,
  projects,
  entries,
  pendingEntries,
  users,
}: {
  allowProjectLevelTimeEntries: boolean;
  isPrivileged: boolean;
  runningEntry: RunningEntry | null;
  projects: ProjectOption[];
  entries: EntryRow[];
  pendingEntries: PendingEntryRow[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(runningEntry ? formatElapsed(runningEntry.startedAt) : "");
  const [selectedTarget, setSelectedTarget] = useState("__none__");
  const [manualDuration, setManualDuration] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [description, setDescription] = useState("");
  const [onBehalfOfUserId, setOnBehalfOfUserId] = useState("__self__");
  const [error, setError] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [lockUserId, setLockUserId] = useState("__none__");
  const [lockPeriodStart, setLockPeriodStart] = useState("");
  const [lockPeriodEnd, setLockPeriodEnd] = useState("");
  const [lockError, setLockError] = useState<string | null>(null);

  useEffect(() => {
    if (!runningEntry) return;
    const interval = setInterval(() => setElapsed(formatElapsed(runningEntry.startedAt)), 1000);
    return () => clearInterval(interval);
  }, [runningEntry]);

  function parseTarget(value: string): { taskId?: string; projectId?: string } {
    const [type, id] = value.split(":");
    return type === "task" ? { taskId: id } : { projectId: id };
  }

  async function handleStart() {
    setError(null);
    if (selectedTarget === "__none__") {
      setError("Bitte einen Task oder ein Projekt auswählen.");
      return;
    }
    const response = await fetch("/api/tenant/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parseTarget(selectedTarget)),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Timer konnte nicht gestartet werden.");
      return;
    }
    router.refresh();
  }

  async function handleStop() {
    await fetch("/api/tenant/timer/stop", { method: "POST" });
    router.refresh();
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (selectedTarget === "__none__") {
      setError("Bitte einen Task oder ein Projekt auswählen.");
      return;
    }
    const response = await fetch("/api/tenant/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parseTarget(selectedTarget),
        durationMinutes: Number(manualDuration),
        description,
        ...(manualDate ? { date: manualDate } : {}),
        ...(onBehalfOfUserId !== "__self__" ? { onBehalfOfUserId } : {}),
      }),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Eintrag konnte nicht angelegt werden.");
      return;
    }
    setManualDuration("");
    setDescription("");
    setManualDate("");
    router.refresh();
  }

  async function handleApprove(id: string) {
    setApprovalError(null);
    const response = await fetch(`/api/tenant/time-entries/${id}/approve`, { method: "PATCH" });
    if (!response.ok) {
      const body = await response.json();
      setApprovalError(body.error ?? "Freigabe fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function handleReject(id: string) {
    setApprovalError(null);
    const response = await fetch(`/api/tenant/time-entries/${id}/reject`, { method: "PATCH" });
    if (!response.ok) {
      const body = await response.json();
      setApprovalError(body.error ?? "Ablehnung fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function handleLockSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLockError(null);
    if (lockUserId === "__none__" || !lockPeriodStart || !lockPeriodEnd) {
      setLockError("Bitte Person und Zeitraum wählen.");
      return;
    }
    const response = await fetch("/api/tenant/timesheet-locks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: lockUserId,
        periodStart: lockPeriodStart,
        periodEnd: lockPeriodEnd,
      }),
    });
    if (!response.ok) {
      const body = await response.json();
      setLockError(body.error ?? "Periode konnte nicht gesperrt werden.");
      return;
    }
    setLockUserId("__none__");
    setLockPeriodStart("");
    setLockPeriodEnd("");
    router.refresh();
  }

  return (
    <Tabs defaultValue="overview" className="pb-10">
      {/* Reference §02: Day/Timesheet/Calendar/Work log as tabs on the same
          Time Entry data. This app's "timer" tracking mode only had the
          Work-log-style flat list before; Timesheet is new, Day/Calendar
          live under the separate "entries" tracking mode (see
          TenantSettings.timeTrackingMode) and aren't merged in here. */}
      <TabsList className="mb-6">
        <TabsTrigger value="overview">Übersicht</TabsTrigger>
        <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
      </TabsList>

      <TabsContent value="timesheet">
        <TimesheetMatrixClient projects={projects} entries={entries} allowProjectLevelTimeEntries={allowProjectLevelTimeEntries} />
      </TabsContent>

      <TabsContent value="overview">
      {runningEntry ? (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-5 py-4">
          <span className="text-sm">
            <strong>{runningEntry.label}</strong> <span className="text-muted-foreground">läuft seit</span>{" "}
            <span className="font-mono text-lg text-primary">{elapsed}</span>
          </span>
          <Button variant="outline" size="sm" onClick={handleStop}>
            Stop
          </Button>
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap gap-3">
          <Select value={selectedTarget} onValueChange={setSelectedTarget}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Task/Projekt wählen…" /></SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectGroup key={project.id}>
                  <SelectLabel>{project.name}</SelectLabel>
                  {allowProjectLevelTimeEntries && <SelectItem value={`project:${project.id}`}>(ganzes Projekt)</SelectItem>}
                  {project.tasks.map((task) => (
                    <SelectItem key={task.id} value={`task:${task.id}`}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleStart}>Timer starten</Button>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <h2 className="mb-3 text-lg font-semibold">Manueller Eintrag</h2>
      <form onSubmit={handleManualSubmit} className="mb-8 flex flex-wrap gap-3">
        {isPrivileged && (
          <Select value={onBehalfOfUserId} onValueChange={setOnBehalfOfUserId}>
            <SelectTrigger className="w-48" aria-label="Für"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__self__">Für: mich selbst</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  Für: {user.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} className="w-40" title="Datum (Standard: heute)" />
        <Input type="number" placeholder="Minuten" value={manualDuration} onChange={(event) => setManualDuration(event.target.value)} required className="w-28" />
        <Input placeholder="Beschreibung (optional)" value={description} onChange={(event) => setDescription(event.target.value)} className="flex-1" />
        <Button type="submit" variant="outline">
          Eintragen
        </Button>
      </form>

      <h2 className="mb-3 text-lg font-semibold">Meine letzten Einträge</h2>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task/Projekt</TableHead>
              <TableHead>Dauer</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.label}</TableCell>
                <TableCell className="text-muted-foreground">{entry.durationMinutes} min</TableCell>
                <TableCell className="text-muted-foreground">{entry.description ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Badge variant={APPROVAL_BADGE_VARIANT[entry.approvalStatus]}>{APPROVAL_LABEL[entry.approvalStatus]}</Badge>
                    {entry.locked && <Badge variant="warningOutline">Gesperrt</Badge>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isPrivileged && (
        <>
          <h2 className="mt-8 mb-3 text-lg font-semibold">Zur Freigabe</h2>
          {approvalError && <p className="mb-3 text-sm text-destructive">{approvalError}</p>}
          {pendingEntries.length === 0 ? (
            <p className="mb-8 text-sm text-muted-foreground">Keine ausstehenden Zeiteinträge.</p>
          ) : (
            <div className="mb-8 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Task/Projekt</TableHead>
                    <TableHead>Dauer</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.userLabel}</TableCell>
                      <TableCell>{entry.label}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.durationMinutes} min</TableCell>
                      <TableCell className="text-muted-foreground">{entry.description ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(entry.id)}>
                            Freigeben
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleReject(entry.id)}>
                            Ablehnen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <h2 className="mb-3 text-lg font-semibold">Periode sperren</h2>
          <form onSubmit={handleLockSubmit} className="mb-6 flex flex-wrap gap-3">
            <Select value={lockUserId} onValueChange={setLockUserId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Person wählen…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Person wählen…</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={lockPeriodStart} onChange={(event) => setLockPeriodStart(event.target.value)} required className="w-auto" />
            <Input type="date" value={lockPeriodEnd} onChange={(event) => setLockPeriodEnd(event.target.value)} required className="w-auto" />
            <Button type="submit" variant="outline">
              Sperren
            </Button>
          </form>
          {lockError && <p className="text-sm text-destructive">{lockError}</p>}
        </>
      )}
      </TabsContent>
    </Tabs>
  );
}
