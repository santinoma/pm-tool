"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/ui/shadcn/lib/utils";

// Productive-Paritäts-Audit (Roadmap #13): Productive kennt 8 addierbare Tab-Typen
// (Tasks, Dashboard, Bookings, Time, Invoices, Docs, Reports, Budgets) — Liste/Board/
// Kalender/Gantt/Hill-Chart sind dort *Ansichten innerhalb eines* Tasks-Tabs, nicht
// eigene Tabs. Cycles, Baselines, Hill Chart, Triage und Check-ins haben in Productive
// gar kein Pendant. Bewusst NICHT entfernt: alle fünf sind echte, funktionierende
// Features — ihre Entfernung wäre ein Funktionsverlust, keine reine Aufräumarbeit.
// Stattdessen sind alle fünf explizit abwählbare Module (siehe moduleCatalog.ts und
// den "Module"-Schritt der Projekterstellung), statt Nutzern Productive-Parität
// vorzutäuschen, wo keine besteht.
const TABS = [
  { segment: "list", label: "Liste" },
  { segment: "board", label: "Board" },
  { segment: "table", label: "Tabelle" },
  { segment: "calendar", label: "Kalender" },
  { segment: "gantt", label: "Gantt" },
  { segment: "timeline", label: "Timeline" },
  { segment: "workload", label: "Workload" },
  { segment: "hill-chart", label: "Hill Chart", module: "hill_chart" },
  { segment: "triage", label: "Triage", module: "triage" },
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
