"use client";

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
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-2)" }}>{baselineName}</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
        Snapshot vom {new Date(createdAt).toLocaleString("de-DE")}
      </p>

      {diff.length === 0 ? (
        <p className="text-muted">Zum Snapshot-Zeitpunkt gab es keine Tasks in diesem Projekt.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Terminverschiebung</th>
              <th>Aufwandsänderung</th>
              <th>Status (damals → heute)</th>
            </tr>
          </thead>
          <tbody>
            {diff.map((entry) => (
              <tr key={entry.taskId}>
                <td>{entry.taskTitle}</td>
                {entry.removed ? (
                  <td colSpan={3} className="text-muted">
                    Task wurde seit dem Snapshot gelöscht.
                  </td>
                ) : (
                  <>
                    <td>{formatShift(entry.dueDateShiftDays)}</td>
                    <td>{formatDelta(entry.estimatedHoursDelta)}</td>
                    <td>
                      {entry.statusChanged
                        ? `${entry.baselineStatusCategory} → ${entry.currentStatusCategory}`
                        : "unverändert"}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
