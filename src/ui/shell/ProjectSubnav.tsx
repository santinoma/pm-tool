"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "list", label: "Liste" },
  { segment: "board", label: "Board" },
  { segment: "calendar", label: "Kalender" },
  { segment: "gantt", label: "Gantt" },
  { segment: "hill-chart", label: "Hill Chart" },
  { segment: "triage", label: "Triage" },
  { segment: "cycles", label: "Cycles", feature: "cycles_sprints" },
  { segment: "baselines", label: "Baselines", feature: "baseline_diffing" },
  { segment: "budget", label: "Budget", feature: "budgets_financials" },
  { segment: "activity", label: "Aktivität" },
  { segment: "wiki", label: "Wiki" },
  { segment: "check-ins", label: "Check-ins" },
  { segment: "settings/workflow", label: "Workflow" },
];

export function ProjectSubnav({
  projectId,
  showTriage = true,
  entitledFeatures = [],
}: {
  projectId: string;
  showTriage?: boolean;
  entitledFeatures?: string[];
}) {
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => tab.segment !== "triage" || showTriage).filter(
    (tab) => !tab.feature || entitledFeatures.includes(tab.feature),
  );

  return (
    <nav className="subnav">
      {tabs.map((tab) => {
        const href = `/projects/${projectId}/${tab.segment}`;
        const isActive = pathname?.startsWith(href);
        return (
          <Link key={tab.segment} href={href} className={`subnav-item${isActive ? " is-active" : ""}`}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
