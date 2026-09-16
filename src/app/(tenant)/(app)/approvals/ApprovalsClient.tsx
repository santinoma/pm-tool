"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/shadcn/components/tabs";

interface TimeEntryRow {
  id: string;
  userLabel: string;
  taskTitle: string | null;
  projectName: string | null;
  description: string | null;
  durationMinutes: number;
  startedAt: string | null;
  createdAt: string;
}

interface ExpenseRow {
  id: string;
  userLabel: string;
  projectName: string | null;
  budgetTitle: string | null;
  description: string;
  amount: number;
  incurredAt: string;
}

interface AbsenceRow {
  id: string;
  userLabel: string;
  type: string;
  startDate: string;
  endDate: string;
  note: string | null;
}

const ABSENCE_TYPE_LABELS: Record<string, string> = { vacation: "Urlaub", sick: "Krank" };

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(2).replace(/\.00$/, "");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE");
}

// Reference "Approving Time/Expense/Absence: Overview" — one inbox, three sources,
// same Approve/Reject action shape for each row.
export function ApprovalsClient({
  timeEntries,
  expenses,
  absenceRequests,
}: {
  timeEntries: TimeEntryRow[];
  expenses: ExpenseRow[];
  absenceRequests: AbsenceRow[];
}) {
  const router = useRouter();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  async function handleAction(url: string, id: string) {
    setPendingIds((current) => new Set(current).add(id));
    const response = await fetch(url, { method: "PATCH" });
    setPendingIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (response.ok) {
      router.refresh();
    }
  }

  async function handleAbsenceAction(id: string, status: "approved" | "rejected") {
    setPendingIds((current) => new Set(current).add(id));
    const response = await fetch(`/api/tenant/absence-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPendingIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="px-4 pb-10 md:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground">Ausstehende Zeit-, Ausgaben- und Abwesenheitsanträge.</p>
      </div>

      <Tabs defaultValue="time">
        <TabsList>
          <TabsTrigger value="time">Zeit{timeEntries.length > 0 ? ` (${timeEntries.length})` : ""}</TabsTrigger>
          <TabsTrigger value="expenses">Ausgaben{expenses.length > 0 ? ` (${expenses.length})` : ""}</TabsTrigger>
          <TabsTrigger value="absence">Abwesenheit{absenceRequests.length > 0 ? ` (${absenceRequests.length})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="time" className="pt-4">
          {timeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine ausstehenden Zeiteinträge.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Projekt / Task</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="text-right">Dauer</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.userLabel}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.projectName ?? "—"}
                        {entry.taskTitle ? ` · ${entry.taskTitle}` : ""}
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">{entry.description ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{formatHours(entry.durationMinutes)}h</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pendingIds.has(entry.id)}
                            onClick={() => handleAction(`/api/tenant/time-entries/${entry.id}/reject`, entry.id)}
                          >
                            Ablehnen
                          </Button>
                          <Button
                            size="sm"
                            disabled={pendingIds.has(entry.id)}
                            onClick={() => handleAction(`/api/tenant/time-entries/${entry.id}/approve`, entry.id)}
                          >
                            Genehmigen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="pt-4">
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine ausstehenden Ausgaben.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Projekt / Budget</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.userLabel}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {expense.projectName ?? "—"}
                        {expense.budgetTitle ? ` · ${expense.budgetTitle}` : ""}
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">{expense.description}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(expense.incurredAt)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{expense.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pendingIds.has(expense.id)}
                            onClick={() => handleAction(`/api/tenant/expenses/${expense.id}/reject`, expense.id)}
                          >
                            Ablehnen
                          </Button>
                          <Button
                            size="sm"
                            disabled={pendingIds.has(expense.id)}
                            onClick={() => handleAction(`/api/tenant/expenses/${expense.id}/approve`, expense.id)}
                          >
                            Genehmigen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="absence" className="pt-4">
          {absenceRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine ausstehenden Abwesenheitsanträge.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Zeitraum</TableHead>
                    <TableHead>Notiz</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absenceRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.userLabel}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ABSENCE_TYPE_LABELS[request.type] ?? request.type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(request.startDate)} – {formatDate(request.endDate)}
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">{request.note ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pendingIds.has(request.id)}
                            onClick={() => handleAbsenceAction(request.id, "rejected")}
                          >
                            Ablehnen
                          </Button>
                          <Button size="sm" disabled={pendingIds.has(request.id)} onClick={() => handleAbsenceAction(request.id, "approved")}>
                            Genehmigen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
