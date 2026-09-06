"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

interface ReportRow {
  id: string;
  name: string;
  category: string | null;
  dataSource: string;
  ownerLabel: string;
  createdAt: string;
}

const DATA_SOURCE_LABELS: Record<string, string> = {
  tasks: "Tasks",
  time_entries: "Zeiteinträge",
  budgets: "Budgets",
};

export function ReportsClient({ reports }: { reports: ReportRow[] }) {
  const [activeCategory, setActiveCategory] = useState("__all__");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const report of reports) {
      if (report.category) set.add(report.category);
    }
    return Array.from(set).sort();
  }, [reports]);

  const visibleReports = activeCategory === "__all__" ? reports : reports.filter((r) => r.category === activeCategory);

  return (
    <div className="grid grid-cols-1 gap-8 py-6 md:grid-cols-[200px_1fr]">
      <nav className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setActiveCategory("__all__")}
          className={cn(
            "rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-muted",
            activeCategory === "__all__" && "bg-primary/10 text-primary",
          )}
        >
          Alle
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={cn(
              "rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-muted",
              activeCategory === category && "bg-primary/10 text-primary",
            )}
          >
            {category}
          </button>
        ))}
      </nav>

      <div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Gespeicherte Berichte. Neue Berichte entstehen in{" "}
          <Link href="/reports/builder" className="text-primary hover:underline">
            Berichte erstellen
          </Link>
          .
        </p>

        {visibleReports.length === 0 ? (
          <div className="rounded-lg border py-14 text-center">
            <h3 className="font-semibold">Noch keine Berichte</h3>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Datenquelle</TableHead>
                  <TableHead>Ersteller</TableHead>
                  <TableHead>Erstellt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Link href={`/reports/builder?reportId=${report.id}`} className="font-semibold hover:text-primary hover:underline">
                        {report.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{report.category ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{DATA_SOURCE_LABELS[report.dataSource] ?? report.dataSource}</TableCell>
                    <TableCell className="text-muted-foreground">{report.ownerLabel}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(report.createdAt).toLocaleDateString("de-DE")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
