"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/ui/shadcn/lib/utils";

const TABS = [
  { segment: "", label: "Meine Zeit" },
  { segment: "absence", label: "Book Absence" },
  { segment: "company", label: "Company Time" },
];

export function TimeSubnav({ showCompanyTime = true }: { showCompanyTime?: boolean }) {
  const pathname = usePathname();
  const tabs = showCompanyTime ? TABS : TABS.filter((tab) => tab.segment !== "company");

  return (
    <nav className="mb-6 flex items-center gap-1 border-b">
      {tabs.map((tab) => {
        const href = tab.segment ? `/time/${tab.segment}` : "/time";
        const isActive = tab.segment ? pathname?.startsWith(href) : pathname === "/time";
        return (
          <Link
            key={tab.segment || "meine-zeit"}
            href={href}
            className={cn(
              "border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
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
