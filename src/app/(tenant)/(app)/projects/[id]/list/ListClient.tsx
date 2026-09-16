"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Download, Lock, Plus, Rows3, Search, Sparkles, Upload, Zap } from "lucide-react";
import { LegendKey } from "@/ui/components/LegendKey";
import { NewTaskModal, type NewTaskModalStatusOption, type NewTaskModalUserOption, type NewTaskModalCustomField, type NewTaskModalTaskOption } from "@/ui/components/NewTaskModal";
import { CsvImportModal } from "@/ui/components/CsvImportModal";
import { SavedViewsBar, type SavedViewRecord } from "@/ui/components/SavedViewsBar";
import { FilterBuilderPopover, type FilterFieldOption } from "@/ui/components/FilterBuilderPopover";
import { evaluateFilterNode, resolveDynamicPlaceholders, parseFilterConfig, type FilterGroup } from "@/tenant/views/filterEngine";

import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

const EMPTY_FILTER_GROUP: FilterGroup = { logic: "AND", rules: [] };

// Reference "universelles Listen-Muster" (§03): Sicht ▾ · Layout ▾ · Fields ·
// Filters · Group · Sort · Automate · Export ⤓ · 🔍 · Primäraktion. "Layout"
// isn't a dropdown here — List/Board/Calendar/Gantt already exist as the
// project's own tab-strip (ProjectSubnav), which is the same underlying
// pattern (same data, switchable form).
const ALL_COLUMNS = [
  { key: "assignee", label: "Assignee" },
  { key: "dueDate", label: "Fälligkeit" },
] as const;
type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];

interface ListTask {
  id: string;
  title: string;
  status: string;
  statusCategory: string;
  assignee: string | null;
  dueDate: string | null;
  isKeyTask: boolean;
  isPrivate: boolean;
  taskListGroupId: string | null;
}

export interface ListTaskListOption {
  id: string;
  label: string;
}

type SortKey = "title" | "status" | "assignee" | "dueDate";
type GroupKey = "status" | "list" | "none";

const NO_LIST_KEY = "__no_list__";

export function ListClient({
  projectId,
  tasks,
  statuses: statusOptions,
  users,
  customFields,
  templates = [],
  taskLists = [],
  savedViews = [],
  currentUserId,
}: {
  projectId: string;
  tasks: ListTask[];
  statuses: NewTaskModalStatusOption[];
  users: NewTaskModalUserOption[];
  customFields: NewTaskModalCustomField[];
  templates?: NewTaskModalTaskOption[];
  taskLists?: ListTaskListOption[];
  savedViews?: SavedViewRecord[];
  currentUserId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(EMPTY_FILTER_GROUP);
  const [groupBy, setGroupBy] = useState<GroupKey>("status");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [titleQuery, setTitleQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({ assignee: true, dueDate: true });
  // Quick Add (Cmd+K → "Neuer Task") navigiert hierher mit ?newTask=1, statt eine
  // zweite Task-Erstell-UI in der Command Palette nachzubauen — das öffnet direkt
  // den bestehenden NewTaskModal-Flow. Lazy initializer statt Effekt+setState,
  // damit der Modal-Zustand schon beim ersten Render feststeht.
  const [creating, setCreating] = useState(() => searchParams.get("newTask") === "1");

  useEffect(() => {
    if (searchParams.get("newTask") === "1") {
      router.replace(`/projects/${projectId}/list`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [importingCsv, setImportingCsv] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [shiftDays, setShiftDays] = useState(1);
  const [bulkBusy, setBulkBusy] = useState(false);

  const statuses = useMemo(() => Array.from(new Set(tasks.map((t) => t.status))), [tasks]);
  const parentTaskOptions: NewTaskModalTaskOption[] = useMemo(
    () => tasks.map((t) => ({ id: t.id, title: t.title })),
    [tasks],
  );

  const filterFields: FilterFieldOption[] = useMemo(
    () => [
      { value: "status", label: "Status", type: "select", options: statuses.map((s) => ({ value: s, label: s })) },
      {
        value: "assigneeLabel",
        label: "Assignee",
        type: "select",
        options: users.map((u) => ({ value: u.label, label: u.label })),
      },
      { value: "isKeyTask", label: "Key Task", type: "boolean" },
      { value: "isPrivate", label: "Privat", type: "boolean" },
    ],
    [statuses, users],
  );

  function getTaskFieldValue(task: ListTask, field: string): unknown {
    switch (field) {
      case "status":
        return task.status;
      case "assigneeLabel":
        return task.assignee;
      case "isKeyTask":
        return task.isKeyTask;
      case "isPrivate":
        return task.isPrivate;
      default:
        return undefined;
    }
  }

  const visibleTasks = useMemo(() => {
    let filtered = tasks.filter((t) => evaluateFilterNode(filterGroup, (field) => getTaskFieldValue(t, field)));
    const query = titleQuery.trim().toLowerCase();
    if (query.length > 0) {
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(query));
    }
    return [...filtered].sort((a, b) => {
      const aValue = a[sortKey] ?? "";
      const bValue = b[sortKey] ?? "";
      return aValue.localeCompare(bValue);
    });
  }, [tasks, sortKey, filterGroup, titleQuery]);

  // CSV export is server-side and only understands a single status filter (not the
  // full AND/OR tree) — best-effort: forward it when the filter is exactly that shape.
  const exportStatusFilter =
    filterGroup.rules.length === 1 && filterGroup.rules[0] && !("logic" in filterGroup.rules[0]) && filterGroup.rules[0].field === "status" && filterGroup.rules[0].operator === "equals"
      ? String(filterGroup.rules[0].value)
      : "";


  // Order groups the same way the project's workflow does (statusOptions is
  // already sorted by position), falling back to first-seen order for any
  // status name not present in the workflow (e.g. legacy/orphaned tasks).
  const groupOrder = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const option of statusOptions) {
      if (visibleTasks.some((t) => t.status === option.name) && !seen.has(option.name)) {
        seen.add(option.name);
        ordered.push(option.name);
      }
    }
    for (const task of visibleTasks) {
      if (!seen.has(task.status)) {
        seen.add(task.status);
        ordered.push(task.status);
      }
    }
    return ordered;
  }, [statusOptions, visibleTasks]);

  const listLabelById = useMemo(() => new Map(taskLists.map((list) => [list.id, list.label])), [taskLists]);

  const groups = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "__all__", label: null as string | null, category: null as string | null, tasks: visibleTasks }];
    }
    if (groupBy === "list") {
      const order = [...taskLists.map((list) => list.id), NO_LIST_KEY];
      return order
        .map((listId) => {
          const groupTasks = visibleTasks.filter((t) => (t.taskListGroupId ?? NO_LIST_KEY) === listId);
          return {
            key: listId,
            label: listId === NO_LIST_KEY ? "Ohne Liste" : listLabelById.get(listId) ?? "Ohne Liste",
            category: null as string | null,
            tasks: groupTasks,
          };
        })
        .filter((group) => group.tasks.length > 0);
    }
    return groupOrder.map((statusName) => {
      const groupTasks = visibleTasks.filter((t) => t.status === statusName);
      return {
        key: statusName,
        label: statusName,
        category: groupTasks[0]?.statusCategory ?? null,
        tasks: groupTasks,
      };
    });
  }, [groupBy, groupOrder, visibleTasks, taskLists, listLabelById]);

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

  function toggleTaskSelection(taskId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function toggleGroupSelection(groupTasks: ListTask[]) {
    const groupIds = groupTasks.map((t) => t.id);
    const allSelected = groupIds.every((id) => selectedIds.has(id));
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function applyBulkPatch(fields: { statusId?: string; assigneeId?: string | null; dueDateShiftDays?: number }) {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      await fetch("/api/tenant/tasks/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: Array.from(selectedIds), ...fields }),
      });
      clearSelection();
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  async function applyBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`${selectedIds.size} Task(s) wirklich löschen?`)) return;
    setBulkBusy(true);
    try {
      await fetch("/api/tenant/tasks/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: Array.from(selectedIds) }),
      });
      clearSelection();
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  function applySavedView(view: SavedViewRecord) {
    const parsedGroup = parseFilterConfig(view.filterConfig);
    setFilterGroup(resolveDynamicPlaceholders(parsedGroup, currentUserId) as FilterGroup);
    const sortConfig = view.sortConfig ?? {};
    if (typeof sortConfig.sortKey === "string") {
      setSortKey(sortConfig.sortKey as SortKey);
    }
    if (typeof sortConfig.groupBy === "string") {
      setGroupBy(sortConfig.groupBy as GroupKey);
    }
  }

  return (
    <div className="pb-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Liste</h1>
        <SavedViewsBar
          scope="project"
          projectId={projectId}
          initialViews={savedViews}
          currentUserId={currentUserId}
          allowSharing
          getCurrentConfig={() => ({
            viewType: "list",
            filterConfig: filterGroup as unknown as Record<string, unknown>,
            sortConfig: { sortKey, groupBy },
          })}
          onApply={applySavedView}
        />
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
        <div className="relative mr-auto max-w-64 grow">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={titleQuery}
            onChange={(event) => setTitleQuery(event.target.value)}
            placeholder="Titel durchsuchen…"
            className="h-9 pl-8"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Rows3 className="size-4" />
              Fields {Object.values(visibleColumns).filter(Boolean).length}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52">
            <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sichtbare Felder</div>
            <div className="flex flex-col gap-2">
              {ALL_COLUMNS.map((column) => (
                <label key={column.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={visibleColumns[column.key]}
                    onCheckedChange={(checked) =>
                      setVisibleColumns((current) => ({ ...current, [column.key]: checked === true }))
                    }
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <FilterBuilderPopover fields={filterFields} value={filterGroup} onChange={setFilterGroup} />

        <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupKey)}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Group: Status</SelectItem>
            <SelectItem value="list">Group: Liste</SelectItem>
            <SelectItem value="none">Group: Kein</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="title">Sort: Titel</SelectItem>
            <SelectItem value="status">Sort: Status</SelectItem>
            <SelectItem value="assignee">Sort: Assignee</SelectItem>
            <SelectItem value="dueDate">Sort: Fälligkeit</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" asChild>
          <Link href="/settings/organization/automations">
            <Zap className="size-4" />
            Automate
          </Link>
        </Button>

        <Button variant="outline" size="sm" asChild>
          <a
            href={`/api/tenant/exports/csv?source=task-list&projectId=${encodeURIComponent(projectId)}${
              exportStatusFilter ? `&statusFilter=${encodeURIComponent(exportStatusFilter)}` : ""
            }`}
          >
            <Download className="size-4" />
            Export
          </a>
        </Button>
        <Button variant="outline" size="sm" onClick={() => setImportingCsv(true)}>
          <Upload className="size-4" />
          CSV importieren
        </Button>
        <Button size="sm" onClick={() => setCreating((current) => !current)}>
          <Plus className="size-4" />
          Task
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
          <span className="text-sm font-medium text-muted-foreground">{selectedIds.size} ausgewählt</span>
          <Select value={bulkStatusId || "__none__"} onValueChange={(value) => setBulkStatusId(value === "__none__" ? "" : value)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Status wählen…</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" disabled={!bulkStatusId || bulkBusy} onClick={() => applyBulkPatch({ statusId: bulkStatusId })}>
            Anwenden
          </Button>
          <Select value={bulkAssigneeId || "__none__"} onValueChange={(value) => setBulkAssigneeId(value === "__none__" ? "" : value)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Assignee wählen…</SelectItem>
              <SelectItem value="__unassign__">Kein Assignee</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!bulkAssigneeId || bulkBusy}
            onClick={() => applyBulkPatch({ assigneeId: bulkAssigneeId === "__unassign__" ? null : bulkAssigneeId })}
          >
            Anwenden
          </Button>
          <input
            type="number"
            min={1}
            value={shiftDays}
            onChange={(event) => setShiftDays(Math.max(1, Number(event.target.value) || 1))}
            className="h-8 w-16 rounded-md border border-input bg-transparent px-2 text-sm"
          />
          <Button variant="outline" size="sm" disabled={bulkBusy} onClick={() => applyBulkPatch({ dueDateShiftDays: shiftDays })}>
            +{shiftDays} Tage
          </Button>
          <Button variant="outline" size="sm" disabled={bulkBusy} onClick={() => applyBulkPatch({ dueDateShiftDays: -shiftDays })}>
            -{shiftDays} Tage
          </Button>
          <Button variant="destructiveSubtle" size="sm" disabled={bulkBusy} onClick={applyBulkDelete}>
            Löschen
          </Button>
          <Button variant="ghost" size="sm" disabled={bulkBusy} onClick={clearSelection}>
            Auswahl aufheben
          </Button>
        </div>
      )}

      {creating && (
        <NewTaskModal
          projectId={projectId}
          statuses={statusOptions}
          users={users}
          customFields={customFields}
          tasks={parentTaskOptions}
          templates={templates}
          taskLists={taskLists.map((list) => ({ id: list.id, label: list.label }))}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      {importingCsv && (
        <CsvImportModal
          title="Tasks per CSV importieren"
          importUrl={`/api/tenant/imports/tasks?projectId=${projectId}`}
          templateUrl="/api/tenant/imports/tasks/template"
          onClose={() => setImportingCsv(false)}
          onImported={() => router.refresh()}
        />
      )}

      {visibleTasks.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Keine Tasks</h3>
          <p className="mt-1 text-sm text-muted-foreground">Lege einen Task an oder passe den Filter an.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Titel</TableHead>
                <TableHead>Status</TableHead>
                {visibleColumns.assignee && <TableHead>Assignee</TableHead>}
                {visibleColumns.dueDate && <TableHead>Fälligkeit</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const isCollapsed = group.label !== null && collapsedGroups.has(group.key);
                const groupAllSelected = group.tasks.length > 0 && group.tasks.every((t) => selectedIds.has(t.id));
                return (
                  <Fragment key={group.key}>
                    {group.label !== null && (
                      <TableRow key={`group-${group.key}`} className="bg-muted/40 hover:bg-muted/40">
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Alle in ${group.label} auswählen`}
                            checked={groupAllSelected}
                            onChange={() => toggleGroupSelection(group.tasks)}
                            className="size-4 accent-primary"
                          />
                        </TableCell>
                        <TableCell colSpan={2 + Object.values(visibleColumns).filter(Boolean).length} className="p-0">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.key)}
                            className="flex w-full items-center gap-3 px-2 py-2 text-left"
                          >
                            <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                            <LegendKey label={group.label} category={group.category ?? undefined} />
                            <span className="text-xs text-muted-foreground">{group.tasks.length}</span>
                          </button>
                        </TableCell>
                      </TableRow>
                    )}
                    {!isCollapsed &&
                      group.tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              aria-label={`Task „${task.title}“ auswählen`}
                              checked={selectedIds.has(task.id)}
                              onChange={() => toggleTaskSelection(task.id)}
                              className="size-4 accent-primary"
                            />
                          </TableCell>
                          <TableCell>
                            {task.isKeyTask && <Sparkles className="mr-1.5 inline size-3.5 text-primary" aria-label="Key Task" />}
                            <Link href={`/projects/${projectId}/tasks/${task.id}`} className="hover:text-primary hover:underline">
                              {task.title}
                            </Link>
                            {task.isPrivate && <Lock className="ml-1.5 inline size-3 text-muted-foreground" aria-label="Privat" />}
                          </TableCell>
                          <TableCell>
                            <LegendKey label={task.status} category={task.statusCategory} />
                          </TableCell>
                          {visibleColumns.assignee && (
                            <TableCell className="text-muted-foreground">{task.assignee ?? "—"}</TableCell>
                          )}
                          {visibleColumns.dueDate && (
                            <TableCell className="text-muted-foreground">
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString("de-DE") : "—"}
                            </TableCell>
                          )}
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
