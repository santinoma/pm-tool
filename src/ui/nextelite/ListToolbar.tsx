import type { ReactNode } from "react";
import { cn } from "@/ui/shadcn/lib/utils";

/**
 * Reference §03 "Universelles Listen-/Tabellen-Muster": "Sicht ▾ · Layout ▾ ·
 * Fields · Filters · Group · Sort · Automate · Export ⤓ · 🔍 · Primäraktion" —
 * dieselbe Toolbar-Anordnung in jedem Modul (die Referenz nennt das den
 * "größten einzelnen UX-Hebel"). Dieses Bauteil liefert die gemeinsame
 * räumliche Anordnung/Reihenfolge — ein Muster, überall gleich. Der Inhalt
 * jedes Slots (Fields-Popover, Filter-Logik, Sort-Optionen …) bleibt beim
 * aufrufenden Screen, weil sich Datenmodell/Optionen zwischen Tasks/
 * Budgets/Members/… zu stark unterscheiden für eine gemeinsame Business-
 * Logik-Komponente (siehe roadmap/PHASE5-ux-patterns.md T502).
 */
export function ListToolbar({
  viewSelector,
  layout,
  search,
  fields,
  filters,
  group,
  sort,
  automate,
  exportAction,
  secondaryActions,
  primaryAction,
  className,
}: {
  /** "Sicht ▾ n" — aktive gespeicherte Sicht + Objektzahl. */
  viewSelector?: ReactNode;
  /** "Layout ▾" — Table/Board/Timeline/Calendar-Umschalter. */
  layout?: ReactNode;
  search?: ReactNode;
  fields?: ReactNode;
  filters?: ReactNode;
  group?: ReactNode;
  sort?: ReactNode;
  automate?: ReactNode;
  exportAction?: ReactNode;
  /** Zusätzliche, nicht in der Referenz benannte Aktionen (z. B. CSV-Import) — bewusst NICHT die Primäraktion. */
  secondaryActions?: ReactNode;
  /** Genau eine gefüllte Primäraktion, ganz rechts. */
  primaryAction?: ReactNode;
  className?: string;
}) {
  const hasViewRow = Boolean(viewSelector || layout);
  return (
    <div className={cn("mb-5 flex flex-col gap-2", className)}>
      {hasViewRow && (
        <div className="flex flex-wrap items-center gap-2">
          {viewSelector}
          {layout}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {search && <div className="mr-auto flex min-w-0 items-center">{search}</div>}
        {fields}
        {filters}
        {group}
        {sort}
        {automate}
        {exportAction}
        {secondaryActions}
        {primaryAction}
      </div>
    </div>
  );
}
