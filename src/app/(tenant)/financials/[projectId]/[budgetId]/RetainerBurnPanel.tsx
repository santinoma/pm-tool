interface SectionBurnRow {
  sectionId: string;
  sectionName: string;
  periodQuantityHours: number;
  usedHours: number;
  remainingHours: number;
  usagePercent: number;
}

const INTERVAL_LABELS: Record<string, string> = { weekly: "Wöchentlich", monthly: "Monatlich" };

export function RetainerBurnPanel({
  periodStart,
  periodEnd,
  interval,
  burn,
}: {
  periodStart: string;
  periodEnd: string;
  interval: string;
  burn: SectionBurnRow[];
}) {
  return (
    <div className="container" style={{ maxWidth: "900px" }}>
      <h2 style={{ marginBottom: "var(--space-1)" }}>Live Burn — laufende Periode</h2>
      <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>
        {INTERVAL_LABELS[interval] ?? interval} · {periodStart} – {periodEnd}
      </p>

      <div className="stack" style={{ gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
        {burn.map((row) => (
          <div key={row.sectionId} className="widget-card">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
              <strong>{row.sectionName}</strong>
              <span className="coord text-muted">
                {row.usedHours.toFixed(1)}h / {row.periodQuantityHours.toFixed(1)}h ({row.usagePercent.toFixed(0)}%)
              </span>
            </div>
            <div className="scale-bar">
              <div
                className={`scale-bar-fill${row.usagePercent > 100 ? " is-over" : ""}`}
                style={{ width: `${Math.min(100, row.usagePercent)}%` }}
              />
            </div>
            <p className="text-muted" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-2)" }}>
              Verbleibend: {row.remainingHours.toFixed(1)}h
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
