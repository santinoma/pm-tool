"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/ui/shadcn/components/badge";
import { Progress } from "@/ui/shadcn/components/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

interface ProjectOption {
  id: string;
  name: string;
}

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

function currencyFormat(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

// Budgets are created per-project (see /financials/[projectId]), so "New Budget"
// here is really "pick a project" — the only route into that project-scoped page.
function NewBudgetPicker({ projects }: { projects: ProjectOption[] }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");

  return (
    <Select
      value={projectId}
      onValueChange={(value) => {
        setProjectId(value);
        router.push(`/financials/${value}`);
      }}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Neues Budget: Projekt wählen…" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FinancialsClient({ budgets, projects }: { budgets: BudgetRow[]; projects: ProjectOption[] }) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Reference §03 "Kopf-Totale": aggregate summary over every visible budget —
  // portfolio-at-a-glance, shown as a stat row above the table.
  const totals = useMemo(() => {
    const revenue = budgets.reduce((sum, b) => sum + b.revenue, 0);
    const usedTimeHours = budgets.reduce((sum, b) => sum + b.usedTimeHours, 0);
    const budgetedTimeHours = budgets.reduce((sum, b) => sum + b.budgetedTimeHours, 0);
    const avgInvoicedPercent = budgets.length > 0 ? budgets.reduce((sum, b) => sum + b.invoicedPercent, 0) / budgets.length : 0;
    return { revenue, usedTimeHours, budgetedTimeHours, avgInvoicedPercent };
  }, [budgets]);

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
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Financials</h1>
        {projects.length > 0 && <NewBudgetPicker projects={projects} />}
      </div>
      <p className="mb-6 text-sm text-muted-foreground">Alle Budgets, gruppiert nach Projekttyp.</p>

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Budgets</h3>
          {projects.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">Wähle ein Projekt, um dessen erstes Budget anzulegen.</p>
              <NewBudgetPicker projects={projects} />
            </>
          )}
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Invoiced</div>
              <div className="mt-1 font-mono text-xl tabular-nums">{totals.avgInvoicedPercent.toFixed(0)}%</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Revenue</div>
              <div className="mt-1 font-mono text-xl tabular-nums">{currencyFormat(totals.revenue)}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Budgeted time</div>
              <div className="mt-1 font-mono text-xl tabular-nums">
                {totals.usedTimeHours.toFixed(0)} / {totals.budgetedTimeHours.toFixed(0)} h
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Budgets</div>
              <div className="mt-1 font-mono text-xl tabular-nums">{budgets.length}</div>
            </div>
          </div>
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
                          <TableCell className="w-32">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={Math.min(budget.invoicedPercent, 100)}
                                variant={budget.invoicedPercent > 100 ? "destructive" : "success"}
                                className="h-1.5"
                              />
                              <span className="font-mono text-xs tabular-nums text-muted-foreground">{budget.invoicedPercent}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono tabular-nums text-muted-foreground">{currencyFormat(budget.revenue)}</TableCell>
                          <TableCell className="w-40">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={budget.budgetedTimeHours > 0 ? Math.min((budget.usedTimeHours / budget.budgetedTimeHours) * 100, 100) : 0}
                                variant={budget.usedTimeHours > budget.budgetedTimeHours ? "destructive" : "success"}
                                className="h-1.5"
                              />
                              <span className="font-mono text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                                {budget.usedTimeHours.toFixed(0)}/{budget.budgetedTimeHours.toFixed(0)}h
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </>
      )}
    </div>
  );
}
