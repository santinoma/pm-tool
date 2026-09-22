"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { NumericCell } from "@/ui/nextelite/NumericCell";
import { cn } from "@/ui/shadcn/lib/utils";

interface ProjectOption {
  id: string;
  name: string;
}

interface ServiceTypeOption {
  id: string;
  name: string;
}

type ApprovalStatus = "pending" | "approved" | "rejected";

interface Expense {
  id: string;
  number: number;
  description: string;
  amount: number;
  billable: boolean;
  incurredAt: string;
  projectId: string;
  projectName: string;
  clientName: string | null;
  budgetLabel: string | null;
  serviceTypeName: string | null;
  personName: string;
  approvalStatus: ApprovalStatus;
  approvedByName: string | null;
}

const APPROVAL_LABEL: Record<ApprovalStatus, string> = { pending: "Ausstehend", approved: "Freigegeben", rejected: "Abgelehnt" };
const APPROVAL_BADGE_VARIANT: Record<ApprovalStatus, "warningOutline" | "successOutline" | "destructiveOutline"> = {
  pending: "warningOutline",
  approved: "successOutline",
  rejected: "destructiveOutline",
};
const MONTH_FORMAT = new Intl.DateTimeFormat("de-DE", { year: "numeric", month: "long" });

export function ExpensesClient({
  projects,
  serviceTypes,
  canApprove,
  expenses,
}: {
  projects: ProjectOption[];
  serviceTypes: ServiceTypeOption[];
  canApprove: boolean;
  expenses: Expense[];
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [serviceTypeId, setServiceTypeId] = useState<string>("__none__");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [billable, setBillable] = useState(true);
  const [incurredAt, setIncurredAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [busyExpenseId, setBusyExpenseId] = useState<string | null>(null);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        description,
        amount: Number(amount),
        billable,
        serviceTypeId: serviceTypeId === "__none__" ? null : serviceTypeId,
        incurredAt: incurredAt || undefined,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Ausgabe konnte nicht angelegt werden.");
      return;
    }
    setDescription("");
    setAmount("");
    setIncurredAt("");
    setServiceTypeId("__none__");
    setBillable(true);
    router.refresh();
  }

  async function handleReview(id: string, action: "approve" | "reject") {
    setBusyExpenseId(id);
    await fetch(`/api/tenant/expenses/${id}/${action}`, { method: "PATCH" });
    setBusyExpenseId(null);
    router.refresh();
  }

  const groups = useMemo(() => {
    const byBudget = new Map<string, { label: string; rows: Expense[] }>();
    for (const expense of expenses) {
      const key = expense.budgetLabel ?? "__no_budget__";
      const label = expense.budgetLabel ?? "Kein Budget";
      const entry = byBudget.get(key);
      if (entry) entry.rows.push(expense);
      else byBudget.set(key, { label, rows: [expense] });
    }
    return Array.from(byBudget.entries()).map(([key, { label, rows }]) => ({ key, label, rows }));
  }, [expenses]);

  return (
    <div className="py-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Ausgaben</h1>
      <p className="mb-6 text-sm text-muted-foreground">Alle Ausgaben projektübergreifend.</p>

      {projects.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Neue Ausgabe</h2>
          <form onSubmit={handleSubmit} className="mb-8 flex flex-wrap items-center gap-3">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Projekt" /></SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— kein Service Type —</SelectItem>
                {serviceTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Beschreibung"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              className="min-w-44 flex-1"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Betrag"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              className="w-32"
            />
            <Input type="date" value={incurredAt} onChange={(event) => setIncurredAt(event.target.value)} className="w-auto" />
            <Label className="flex items-center gap-2 text-sm font-normal">
              <Checkbox checked={billable} onCheckedChange={(checked) => setBillable(checked === true)} />
              Billable
            </Label>
            <Button type="submit" loading={saving}>
              Anlegen
            </Button>
          </form>
          {error && <p className="mb-6 text-sm text-destructive">{error}</p>}
        </>
      )}

      {groups.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Ausgaben</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Beschreibung</TableHead>
                <TableHead>Service type</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Billable</TableHead>
                <TableHead className="text-right">Net expense cost</TableHead>
                <TableHead>Approval status</TableHead>
                <TableHead>Approved by</TableHead>
                {canApprove && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const isCollapsed = collapsedGroups.has(group.key);
                const monthGroups = new Map<string, Expense[]>();
                for (const expense of group.rows) {
                  const monthKey = MONTH_FORMAT.format(new Date(expense.incurredAt));
                  const list = monthGroups.get(monthKey);
                  if (list) list.push(expense);
                  else monthGroups.set(monthKey, [expense]);
                }
                return (
                  <Fragment key={group.key}>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={canApprove ? 10 : 9} className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          className="flex w-full items-center gap-3 px-2 py-2 text-left"
                        >
                          <span className={cn("inline-block size-3.5 shrink-0 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")}>▾</span>
                          <span className="font-medium">{group.label}</span>
                          <span className="text-xs text-muted-foreground">{group.rows.length}</span>
                        </button>
                      </TableCell>
                    </TableRow>
                    {!isCollapsed &&
                      Array.from(monthGroups.entries()).map(([monthLabel, monthRows]) => (
                        <Fragment key={monthLabel}>
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={canApprove ? 10 : 9} className="pt-3 pb-1 text-xs font-semibold text-muted-foreground">
                              {monthLabel}
                            </TableCell>
                          </TableRow>
                          {monthRows.map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell className="text-muted-foreground">{expense.number}</TableCell>
                              <TableCell className="font-semibold">{expense.description}</TableCell>
                              <TableCell className="text-muted-foreground">{expense.serviceTypeName ?? "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{expense.personName}</TableCell>
                              <TableCell className="text-muted-foreground">{expense.clientName ?? "—"}</TableCell>
                              <NumericCell value={expense.billable ? expense.amount : 0} className="text-muted-foreground" />
                              <NumericCell value={expense.amount} className="text-muted-foreground" />
                              <TableCell>
                                <Badge variant={APPROVAL_BADGE_VARIANT[expense.approvalStatus]}>{APPROVAL_LABEL[expense.approvalStatus]}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{expense.approvedByName ?? "—"}</TableCell>
                              {canApprove && (
                                <TableCell>
                                  {expense.approvalStatus === "pending" && (
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        loading={busyExpenseId === expense.id}
                                        onClick={() => handleReview(expense.id, "approve")}
                                      >
                                        Freigeben
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        loading={busyExpenseId === expense.id}
                                        onClick={() => handleReview(expense.id, "reject")}
                                      >
                                        Ablehnen
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </Fragment>
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
