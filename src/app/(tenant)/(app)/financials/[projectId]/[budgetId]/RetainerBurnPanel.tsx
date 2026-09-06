import { Progress } from "@/ui/shadcn/components/progress";

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
    <div className="mx-auto max-w-3xl pb-10">
      <h2 className="mb-1 text-lg font-semibold">Live Burn — laufende Periode</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {INTERVAL_LABELS[interval] ?? interval} · {periodStart} – {periodEnd}
      </p>

      <div className="mb-8 flex flex-col gap-4">
        {burn.map((row) => (
          <div key={row.sectionId} className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <strong className="text-sm">{row.sectionName}</strong>
              <span className="text-xs text-muted-foreground">
                {row.usedHours.toFixed(1)}h / {row.periodQuantityHours.toFixed(1)}h ({row.usagePercent.toFixed(0)}%)
              </span>
            </div>
            <Progress value={Math.min(100, row.usagePercent)} variant={row.usagePercent > 100 ? "destructive" : "default"} />
            <p className="mt-2 text-sm text-muted-foreground">Verbleibend: {row.remainingHours.toFixed(1)}h</p>
          </div>
        ))}
      </div>
    </div>
  );
}
