"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "", label: "Meine Zeit" },
  { segment: "absence", label: "Book Absence" },
  { segment: "company", label: "Company Time" },
];

export function TimeSubnav({ showCompanyTime = true }: { showCompanyTime?: boolean }) {
  const pathname = usePathname();
  const tabs = showCompanyTime ? TABS : TABS.filter((tab) => tab.segment !== "company");

  return (
    <nav className="subnav">
      {tabs.map((tab) => {
        const href = tab.segment ? `/time/${tab.segment}` : "/time";
        const isActive = tab.segment ? pathname?.startsWith(href) : pathname === "/time";
        return (
          <Link key={tab.segment || "meine-zeit"} href={href} className={`subnav-item${isActive ? " is-active" : ""}`}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
