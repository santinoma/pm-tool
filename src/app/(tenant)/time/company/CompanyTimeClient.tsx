"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserWeekSummary, DaySummary } from "@/tenant/companyTime/weekSummary";

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function formatDayLabel(date: string, index: number): string {
  const [, month, day] = date.split("-");
  return `${DAY_LABELS[index]} ${Number(day)}.${Number(month)}.`;
}

export function CompanyTimeClient({
  isEntriesMode,
  weekDates,
  summary,
  previousWeek,
  nextWeek,
}: {
  isEntriesMode: boolean;
  weekDates: string[];
  summary: UserWeekSummary[];
  previousWeek: string;
  nextWeek: string;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<{ userLabel: string; day: DaySummary } | null>(null);

  function goToWeek(date: string) {
    router.push(`/time/company?week=${date}`);
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <h1>Company Time</h1>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <button type="button" onClick={() => goToWeek(previousWeek)} className="btn btn-secondary btn-sm">
            ← Vorherige Woche
          </button>
          <button type="button" onClick={() => goToWeek(nextWeek)} className="btn btn-secondary btn-sm">
            Nächste Woche →
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              {weekDates.map((date, index) => (
                <th key={date} className="coord">
                  {formatDayLabel(date, index)}
                </th>
              ))}
              <th className="coord">Summe</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.userId}>
                <td>{row.userLabel}</td>
                {row.days.map((day) => (
                  <td
                    key={day.date}
                    className="coord"
                    style={{
                      cursor: isEntriesMode && day.entries.length > 0 ? "pointer" : "default",
                      background: day.isAbsence ? "var(--accent-tint)" : undefined,
                    }}
                    onClick={() => {
                      if (isEntriesMode && day.entries.length > 0) {
                        setDetail({ userLabel: row.userLabel, day });
                      }
                    }}
                  >
                    {day.hours > 0 ? `${day.hours}h` : "—"}
                    {day.isAbsence && <span title="Genehmigte Abwesenheit"> 🏖</span>}
                  </td>
                ))}
                <td className="coord">
                  <strong>{row.totalHours}h</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <h2>
              {detail.userLabel} · {detail.day.date}
            </h2>
            <div className="stack" style={{ gap: "var(--space-3)" }}>
              {detail.day.entries.map((entry, index) => (
                <div key={index} className="widget-card" style={{ padding: "var(--space-3)" }}>
                  {entry.timeRange && (
                    <span className="coord" style={{ display: "block", marginBottom: "var(--space-1)" }}>
                      {entry.timeRange}
                    </span>
                  )}
                  {entry.serviceLabel && <strong style={{ display: "block" }}>{entry.serviceLabel}</strong>}
                  <span className="text-muted">{entry.description ?? "—"}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setDetail(null)} className="btn btn-secondary">
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
