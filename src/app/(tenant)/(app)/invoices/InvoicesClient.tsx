"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { NumericCell } from "@/ui/nextelite/NumericCell";
import { cn } from "@/ui/shadcn/lib/utils";

interface InvoiceRow {
  id: string;
  projectId: string;
  projectName: string;
  budgetId: string;
  budgetTitle: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

type GroupBy = "none" | "status" | "project";

export function InvoicesClient({ invoices }: { invoices: InvoiceRow[] }) {
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (invoice) => invoice.projectName.toLowerCase().includes(q) || invoice.budgetTitle.toLowerCase().includes(q),
    );
  }, [invoices, query]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: null, rows: filtered }];
    const byKey = new Map<string, InvoiceRow[]>();
    for (const invoice of filtered) {
      const key = groupBy === "status" ? invoice.status : invoice.projectName;
      const list = byKey.get(key);
      if (list) list.push(invoice);
      else byKey.set(key, [invoice]);
    }
    return Array.from(byKey.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, rows]) => ({ key, label: key, rows }));
  }, [filtered, groupBy]);

  return (
    <div className="py-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Rechnungen</h1>
        <Link href="/financials" className="text-sm text-primary hover:underline">
          Neue Rechnung im Budget erstellen →
        </Link>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Alle Rechnungen projektübergreifend. Rechnungen werden innerhalb eines Budgets erstellt.
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Projekt oder Budget suchen…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-64"
        />
        <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nicht gruppieren</SelectItem>
            <SelectItem value="status">Gruppieren: Status</SelectItem>
            <SelectItem value="project">Gruppieren: Projekt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border py-14 text-center">
          <h3 className="font-semibold">{query ? "Keine Treffer" : "Noch keine Rechnungen"}</h3>
          {!query && (
            <Link href="/financials" className="text-sm text-primary hover:underline">
              Zu Financials, um ein Budget mit Rechnung anzulegen →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projekt</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead>Erstellt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const isCollapsed = collapsedGroups.has(group.key);
                return (
                  <Fragment key={group.key}>
                    {group.label && (
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={5} className="p-0">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.key)}
                            className="flex w-full items-center gap-3 px-2 py-2 text-left"
                          >
                            <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                            <span className="font-medium">{group.label}</span>
                            <span className="text-xs text-muted-foreground">{group.rows.length}</span>
                          </button>
                        </TableCell>
                      </TableRow>
                    )}
                    {!isCollapsed &&
                      group.rows.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <Link
                              href={`/financials/${invoice.projectId}/${invoice.budgetId}`}
                              className="font-semibold hover:text-primary hover:underline"
                            >
                              {invoice.projectName}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{invoice.budgetTitle}</TableCell>
                          <TableCell className="text-muted-foreground">{invoice.status}</TableCell>
                          <NumericCell value={invoice.totalAmount} className="text-muted-foreground" />
                          <TableCell className="text-muted-foreground">
                            {new Date(invoice.createdAt).toLocaleDateString("de-DE")}
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
