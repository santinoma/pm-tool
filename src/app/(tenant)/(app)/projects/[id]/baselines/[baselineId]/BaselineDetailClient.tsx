"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

interface DiffEntry {
  taskId: string;
  taskTitle: string;
  removed: boolean;
  dueDateShiftDays: number | null;
  estimatedHoursDelta: number | null;
  statusChanged: boolean;
  baselineStatusCategory: string;
  currentStatusCategory: string | null;
}

function formatShift(days: number | null): string {
  if (days === null) return "–";
  if (days === 0) return "unverändert";
  return days > 0 ? `+${days} Tage` : `${days} Tage`;
}

function formatDelta(delta: number | null): string {
  if (delta === null) return "–";
  if (delta === 0) return "unverändert";
  return delta > 0 ? `+${delta}h` : `${delta}h`;
}

export function BaselineDetailClient({
  baselineName,
  createdAt,
  diff,
}: {
  baselineName: string;
  createdAt: string;
  diff: DiffEntry[];
}) {
  return (
    <div className="pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{baselineName}</h1>
      <p className="mb-6 text-sm text-muted-foreground">Snapshot vom {new Date(createdAt).toLocaleString("de-DE")}</p>

      {diff.length === 0 ? (
        <p className="text-sm text-muted-foreground">Zum Snapshot-Zeitpunkt gab es keine Tasks in diesem Projekt.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Terminverschiebung</TableHead>
                <TableHead>Aufwandsänderung</TableHead>
                <TableHead>Status (damals → heute)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diff.map((entry) => (
                <TableRow key={entry.taskId}>
                  <TableCell className="font-medium">{entry.taskTitle}</TableCell>
                  {entry.removed ? (
                    <TableCell colSpan={3} className="text-muted-foreground">
                      Task wurde seit dem Snapshot gelöscht.
                    </TableCell>
                  ) : (
                    <>
                      <TableCell>{formatShift(entry.dueDateShiftDays)}</TableCell>
                      <TableCell>{formatDelta(entry.estimatedHoursDelta)}</TableCell>
                      <TableCell>
                        {entry.statusChanged ? `${entry.baselineStatusCategory} → ${entry.currentStatusCategory}` : "unverändert"}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
