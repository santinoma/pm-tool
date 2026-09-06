"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/ui/shadcn/lib/utils";

// Productive-Paritäts-Audit (Roadmap #13): Productive kennt 8 addierbare Tab-Typen
// (Tasks, Dashboard, Bookings, Time, Invoices, Docs, Reports, Budgets) — Liste/Board/
// Kalender/Gantt/Hill-Chart sind dort *Ansichten innerhalb eines* Tasks-Tabs, nicht
// eigene Tabs. Hill Chart, Baselines und Check-ins haben in Productive gar kein
// Pendant. Bewusst NICHT entfernt: alle drei sind echte, funktionierende Features
// (siehe hill-chart/page.tsx, Baseline-Modell, check-ins/page.tsx + 2 API-Routen) —
// ihre Entfernung wäre ein Funktionsverlust, keine reine Aufräumarbeit, und bleibt
// eine bewusste Produktentscheidung statt eines automatischen Cleanups.
//
// Projects-Cleanup: Kalender/Gantt/Hill-Chart sind jetzt Module wie Cycles/
// Baselines (per Projekt an-/abschaltbar, siehe moduleCatalog.ts), Kern bleiben
// nur Liste, Board und Tasks selbst. "Triage" heißt für Nutzer jetzt "Erfassung"
// (der interne Name/URL-Pfad `triage` bleibt unverändert, nur das Label ändert sich).
const TABS = [
  { segment: "list", label: "Liste" },
  { segment: "board", label: "Board" },
  { segment: "calendar", label: "Kalender", module: "calendar" },
  { segment: "gantt", label: "Gantt", module: "gantt" },
  { segment: "hill-chart", label: "Hill Chart", module: "hill_chart" },
  { segment: "triage", label: "Erfassung" },
  { segment: "cycles", label: "Cycles", feature: "cycles_sprints", module: "cycles" },
  { segment: "baselines", label: "Baselines", feature: "baseline_diffing", module: "baselines" },
  { segment: "budget", label: "Budget", feature: "budgets_financials", module: "budgets" },
  { segment: "activity", label: "Aktivität", module: "activity" },
  { segment: "wiki", label: "Wiki", module: "wiki" },
  { segment: "check-ins", label: "Check-ins", module: "check_ins" },
  { segment: "settings/workflow", label: "Workflow" },
  { segment: "settings/task-lists", label: "Listen" },
];

export function ProjectSubnav({
  projectId,
  showTriage = true,
  entitledFeatures = [],
  enabledModules,
}: {
  projectId: string;
  showTriage?: boolean;
  entitledFeatures?: string[];
  /** Effektive Modul-Liste (ausgewählt ∪ vorhandene Daten). `undefined` = keine Modul-Filterung. */
  enabledModules?: string[];
}) {
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => tab.segment !== "triage" || showTriage)
    .filter((tab) => !tab.feature || entitledFeatures.includes(tab.feature))
    .filter((tab) => !enabledModules || !tab.module || enabledModules.includes(tab.module));

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b px-4 md:px-6">
      {tabs.map((tab) => {
        const href = `/projects/${projectId}/${tab.segment}`;
        const isActive = pathname?.startsWith(href);
        return (
          <Link
            key={tab.segment}
            href={href}
            className={cn(
              "shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              isActive && "border-primary text-primary",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
