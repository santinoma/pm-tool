"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/ui/shadcn/components/badge";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

interface Company {
  id: string;
  name: string;
  type: string | null;
  accountOwnerLabel: string | null;
  paymentTermsDays: number | null;
  archived: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  customer: "Customer",
  supplier: "Supplier",
  partner: "Partner",
  internal: "Internal",
  recruitment: "Recruitment",
};

type GroupBy = "none" | "type" | "status";

export function CompaniesClient({ companies }: { companies: Company[] }) {
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("type");
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
    if (!q) return companies;
    return companies.filter(
      (company) =>
        company.name.toLowerCase().includes(q) ||
        (company.accountOwnerLabel ?? "").toLowerCase().includes(q) ||
        (company.type ? (TYPE_LABELS[company.type] ?? company.type).toLowerCase().includes(q) : false),
    );
  }, [companies, query]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: null, rows: filtered }];
    const byKey = new Map<string, Company[]>();
    for (const company of filtered) {
      const key =
        groupBy === "type"
          ? (company.type ? (TYPE_LABELS[company.type] ?? company.type) : "Kein Typ")
          : company.archived
            ? "Archiviert"
            : "Active";
      const list = byKey.get(key);
      if (list) list.push(company);
      else byKey.set(key, [company]);
    }
    return Array.from(byKey.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, rows]) => ({ key, label: key, rows }));
  }, [filtered, groupBy]);

  return (
    <div className="py-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Companies</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Alle Companies. Für Hierarchie, Kontakte und CSV-Import siehe{" "}
        <Link href="/settings/organization/clients" className="text-primary hover:underline">
          Organisation → Clients
        </Link>
        .
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Suchen…"
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
            <SelectItem value="type">Gruppieren: Typ</SelectItem>
            <SelectItem value="status">Gruppieren: Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">{query ? "Keine Treffer" : "Noch keine Companies"}</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Account owner</TableHead>
                <TableHead>Payment terms</TableHead>
                <TableHead>Status</TableHead>
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
                      group.rows.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell>
                            <Link href="/settings/organization/clients" className="font-semibold hover:text-primary hover:underline">
                              {company.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{company.type ? TYPE_LABELS[company.type] : "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{company.accountOwnerLabel ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {company.paymentTermsDays !== null ? `${company.paymentTermsDays} Tage` : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={company.archived ? "destructiveOutline" : "successOutline"}>
                              {company.archived ? "Archiviert" : "Active"}
                            </Badge>
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
