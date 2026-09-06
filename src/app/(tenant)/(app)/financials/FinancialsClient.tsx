"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/ui/shadcn/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

interface BudgetRow {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  projectType: "internal" | "client";
  projectManagerName: string | null;
  timeApprovalRequired: boolean;
  expenseApprovalRequired: boolean;
  invoicedPercent: number;
  revenue: number;
  budgetedTimeHours: number;
  usedTimeHours: number;
}

const CATEGORY_LABEL: Record<BudgetRow["projectType"], string> = { internal: "Internal", client: "Client" };

function ApprovalToggle({ projectId, field, value }: { projectId: string; field: "timeApprovalRequired" | "expenseApprovalRequired"; value: boolean }) {
  const [checked, setChecked] = useState(value);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    const next = !checked;
    const response = await fetch(`/api/tenant/projects/${projectId}/approval-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: next }),
    });
    setSaving(false);
    if (response.ok) setChecked(next);
  }

  return (
    <button type="button" onClick={toggle} disabled={saving} className="disabled:opacity-50">
      <Badge variant={checked ? "successOutline" : "outline"}>{checked ? "Yes" : "No"}</Badge>
    </button>
  );
}

export function FinancialsClient({ budgets }: { budgets: BudgetRow[] }) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const groups = useMemo(() => {
    const byType = new Map<string, BudgetRow[]>();
    for (const budget of budgets) {
      const list = byType.get(budget.projectType);
      if (list) list.push(budget);
      else byType.set(budget.projectType, [budget]);
    }
    return (["internal", "client"] as const)
      .filter((type) => byType.has(type))
      .map((type) => ({ key: type, label: CATEGORY_LABEL[type], rows: byType.get(type)! }));
  }, [budgets]);

  return (
    <div className="pb-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Financials</h1>
      <p className="mb-6 text-sm text-muted-foreground">Alle Budgets, gruppiert nach Projekttyp.</p>

      {budgets.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Budgets</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Budget</TableHead>
                <TableHead>Project manager</TableHead>
                <TableHead>Time approval</TableHead>
                <TableHead>Expense approval</TableHead>
                <TableHead>Invoiced %</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Budgeted time usage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const isCollapsed = collapsedGroups.has(group.key);
                return (
                  <Fragment key={group.key}>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={7} className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          className="flex w-full items-center gap-3 px-2 py-2 text-left"
                        >
                          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                          <Badge variant="outline">{group.label}</Badge>
                          <span className="text-xs text-muted-foreground">{group.rows.length}</span>
                        </button>
                      </TableCell>
                    </TableRow>
                    {!isCollapsed &&
                      group.rows.map((budget) => (
                        <TableRow key={budget.id}>
                          <TableCell>
                            <Link href={`/financials/${budget.projectId}/${budget.id}`} className="font-semibold hover:text-primary hover:underline">
                              {budget.projectName} – {budget.title}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{budget.projectManagerName ?? "—"}</TableCell>
                          <TableCell>
                            <ApprovalToggle projectId={budget.projectId} field="timeApprovalRequired" value={budget.timeApprovalRequired} />
                          </TableCell>
                          <TableCell>
                            <ApprovalToggle projectId={budget.projectId} field="expenseApprovalRequired" value={budget.expenseApprovalRequired} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{budget.invoicedPercent}%</TableCell>
                          <TableCell className="text-muted-foreground">{budget.revenue.toFixed(2)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {budget.usedTimeHours.toFixed(2)}h / {budget.budgetedTimeHours.toFixed(2)}h
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
