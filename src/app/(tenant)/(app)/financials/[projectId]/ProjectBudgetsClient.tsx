"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { SavedViewsBar, type SavedViewRecord } from "@/ui/components/SavedViewsBar";
import { FilterBuilderPopover, type FilterFieldOption } from "@/ui/components/FilterBuilderPopover";
import { SortDirectionButton, type SortDirection } from "@/ui/components/SortDirectionButton";
import { evaluateFilterNode, resolveDynamicPlaceholders, parseFilterConfig, type FilterGroup } from "@/tenant/views/filterEngine";
import { ListToolbar } from "@/ui/nextelite/ListToolbar";
import { NumericCell } from "@/ui/nextelite/NumericCell";

const EMPTY_FILTER_GROUP: FilterGroup = { logic: "AND", rules: [] };

interface BudgetRow {
  id: string;
  title: string;
  ownerId: string;
  ownerLabel: string;
  sectionCount: number;
  budgetTotal: number;
}

type SortKey = "title" | "ownerLabel" | "budgetTotal";

export function ProjectBudgetsClient({
  projectId,
  projectName,
  canManage,
  budgets,
  users,
  templates,
  savedViews = [],
  currentUserId,
}: {
  projectId: string;
  projectName: string;
  canManage: boolean;
  budgets: BudgetRow[];
  users: { id: string; label: string }[];
  templates: { id: string; title: string; projectName: string }[];
  savedViews?: SavedViewRecord[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(EMPTY_FILTER_GROUP);
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
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

  const filterFields: FilterFieldOption[] = useMemo(
    () => [
      { value: "ownerId", label: "Owner", type: "select", options: users.map((u) => ({ value: u.id, label: u.label })) },
      { value: "title", label: "Titel", type: "text" },
    ],
    [users],
  );

  function getBudgetFieldValue(budget: BudgetRow, field: string): unknown {
    switch (field) {
      case "ownerId":
        return budget.ownerId;
      case "title":
        return budget.title;
      default:
        return undefined;
    }
  }

  const visibleBudgets = useMemo(() => {
    const filtered = budgets.filter((b) => evaluateFilterNode(filterGroup, (field) => getBudgetFieldValue(b, field)));
    return [...filtered].sort((a, b) => {
      if (sortKey === "budgetTotal") {
        return sortDir === "asc" ? a.budgetTotal - b.budgetTotal : b.budgetTotal - a.budgetTotal;
      }
      return sortDir === "asc" ? a[sortKey].localeCompare(b[sortKey]) : b[sortKey].localeCompare(a[sortKey]);
    });
  }, [budgets, filterGroup, sortKey, sortDir]);

  function applySavedView(view: SavedViewRecord) {
    const parsedGroup = parseFilterConfig(view.filterConfig);
    setFilterGroup(resolveDynamicPlaceholders(parsedGroup, currentUserId) as FilterGroup);
    const sortConfig = view.sortConfig ?? {};
    if (typeof sortConfig.sortKey === "string") {
      setSortKey(sortConfig.sortKey as SortKey);
    }
    if (sortConfig.sortDir === "asc" || sortConfig.sortDir === "desc") {
      setSortDir(sortConfig.sortDir);
    }
  }

  return (
    <div className="pb-10">
      <div className="mb-3">
        <div className="text-xs text-muted-foreground">{projectName}</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Budgets</h1>
      </div>

      {/* Reference §03 universelles Listen-Muster: Sicht/Filters/Sort + genau eine Primäraktion. */}
      <ListToolbar
        viewSelector={
          <SavedViewsBar
            scope="budgets"
            projectId={projectId}
            initialViews={savedViews}
            currentUserId={currentUserId}
            allowSharing
            getCurrentConfig={() => ({
              viewType: "budgets",
              filterConfig: filterGroup as unknown as Record<string, unknown>,
              sortConfig: { sortKey, sortDir },
            })}
            onApply={applySavedView}
          />
        }
        filters={<FilterBuilderPopover fields={filterFields} value={filterGroup} onChange={setFilterGroup} />}
        sort={
          <>
            <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Sort: Titel</SelectItem>
                <SelectItem value="ownerLabel">Sort: Owner</SelectItem>
                <SelectItem value="budgetTotal">Sort: Budget Total</SelectItem>
              </SelectContent>
            </Select>
            <SortDirectionButton direction={sortDir} onToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} />
          </>
        }
        primaryAction={
          canManage && (
            <Button onClick={() => setCreating((c) => !c)}>
              <Plus className="size-4" />
              Neues Budget
            </Button>
          )
        }
      />

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
                      {template.title} ({template.projectName})
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
      ) : visibleBudgets.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Keine Budgets</h3>
          <p className="mt-1 text-sm text-muted-foreground">Kein Budget entspricht dem aktuellen Filter.</p>
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
              {visibleBudgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell>
                    <Link href={`/financials/${projectId}/${budget.id}`} className="font-semibold hover:text-primary hover:underline">
                      {budget.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{budget.ownerLabel}</TableCell>
                  <TableCell className="text-muted-foreground">{budget.sectionCount}</TableCell>
                  <NumericCell value={budget.budgetTotal} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
