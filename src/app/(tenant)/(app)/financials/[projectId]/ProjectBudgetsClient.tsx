"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

interface BudgetRow {
  id: string;
  title: string;
  ownerLabel: string;
  sectionCount: number;
  budgetTotal: number;
}

export function ProjectBudgetsClient({
  projectId,
  projectName,
  canManage,
  budgets,
  users,
  templates,
}: {
  projectId: string;
  projectName: string;
  canManage: boolean;
  budgets: BudgetRow[];
  users: { id: string; label: string }[];
  templates: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState(users[0]?.id ?? "");
  const [isRetainer, setIsRetainer] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<"weekly" | "monthly">("monthly");
  const [templateBudgetId, setTemplateBudgetId] = useState("__none__");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/tenant/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        title,
        ownerId,
        isRetainer,
        recurrenceInterval: isRetainer ? recurrenceInterval : undefined,
        templateBudgetId: templateBudgetId === "__none__" ? undefined : templateBudgetId,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Budget konnte nicht angelegt werden.");
      return;
    }
    router.push(`/financials/${projectId}/${data.budget.id}`);
  }

  return (
    <div className="pb-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground">{projectName}</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Budgets</h1>
        </div>
        {canManage && (
          <Button onClick={() => setCreating((c) => !c)}>
            <Plus className="size-4" />
            Neues Budget
          </Button>
        )}
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="mb-6 flex max-w-md flex-col gap-4 rounded-lg border p-5">
          <div className="flex flex-col gap-2">
            <Label>Titel</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="z. B. Retainer 2026" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Budget Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isRetainer} onCheckedChange={(checked) => setIsRetainer(checked === true)} />
            Retainer (wiederkehrendes Kontingent)
          </label>
          {isRetainer && (
            <div className="flex flex-col gap-2">
              <Label>Intervall</Label>
              <Select value={recurrenceInterval} onValueChange={(value) => setRecurrenceInterval(value as "weekly" | "monthly")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monatlich</SelectItem>
                  <SelectItem value="weekly">Wöchentlich</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {templates.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Vorlage</Label>
              <Select value={templateBudgetId} onValueChange={setTemplateBudgetId}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— keine Vorlage —</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit">Anlegen</Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      )}

      {budgets.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Budgets</h3>
          <p className="mt-1 text-sm text-muted-foreground">Lege das erste Budget für dieses Projekt an.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead className="text-right">Budget Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell>
                    <Link href={`/financials/${projectId}/${budget.id}`} className="font-semibold hover:text-primary hover:underline">
                      {budget.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{budget.ownerLabel}</TableCell>
                  <TableCell className="text-muted-foreground">{budget.sectionCount}</TableCell>
                  <TableCell className="text-right font-mono">{budget.budgetTotal.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
