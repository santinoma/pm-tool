"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Download, Lock, Plus, Rows3, Search, Sparkles, Upload, Zap } from "lucide-react";
import { LegendKey, StatusSquare } from "@/ui/components/LegendKey";
import { NewTaskModal, type NewTaskModalStatusOption, type NewTaskModalUserOption, type NewTaskModalCustomField, type NewTaskModalTaskOption } from "@/ui/components/NewTaskModal";
import { CsvImportModal } from "@/ui/components/CsvImportModal";
import { SavedViewsBar, type SavedViewRecord } from "@/ui/components/SavedViewsBar";
import { FilterBuilderPopover, type FilterFieldOption } from "@/ui/components/FilterBuilderPopover";
import { SortDirectionButton, type SortDirection } from "@/ui/components/SortDirectionButton";
import { evaluateFilterNode, resolveDynamicPlaceholders, parseFilterConfig, type FilterGroup } from "@/tenant/views/filterEngine";
import { Avatar } from "@/ui/components/Avatar";
import { ListToolbar } from "@/ui/nextelite/ListToolbar";
import { PriorityPill } from "@/ui/nextelite/PriorityPill";

import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

const EMPTY_FILTER_GROUP: FilterGroup = { logic: "AND", rules: [] };

// Reference "universelles Listen-Muster" (§03): Sicht ▾ · Layout ▾ · Fields ·
// Filters · Group · Sort · Automate · Export ⤓ · 🔍 · Primäraktion — siehe
// `ListToolbar` für die gemeinsame Anordnung. "Layout" ist hier keine eigene
// Dropdown — List/Board/Calendar/Gantt existieren bereits als das Projekt-
// Tab-Strip (ProjectSubnav), dasselbe zugrunde liegende Muster (gleiche
// Daten, umschaltbare Form).
const ALL_COLUMNS = [
  { key: "assignee", label: "Assignee" },
  { key: "startDate", label: "Start" },
  { key: "dueDate", label: "Fälligkeit" },
  { key: "priority", label: "Priorität" },
] as const;
type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];

const DEFAULT_COLUMN_ORDER: ColumnKey[] = ["assignee", "startDate", "dueDate", "priority"];
const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  assignee: true,
  startDate: false,
  dueDate: true,
  priority: false,
};
const COLUMN_LABEL: Record<ColumnKey, string> = Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, c.label])) as Record<ColumnKey, string>;

interface ListTask {
  id: string;
  title: string;
  statusId: string;
  status: string;
  statusCategory: string;
  assigneeId: string | null;
  assignee: string | null;
  startDate: string | null;
  dueDate: string | null;
  priority: string;
  isKeyTask: boolean;
  isPrivate: boolean;
  taskListGroupId: string | null;
}

export interface ListTaskListOption {
  id: string;
  label: string;
}

type SortKey = "title" | "status" | "assignee" | "dueDate";
type GroupKey = "status" | "list" | "assignee" | "none";

const NO_LIST_KEY = "__no_list__";
const NO_ASSIGNEE_KEY = "__no_assignee__";

// Reference §03: "leere Felder mit Platzhaltern ('Add …')". `overdue` marks
// the reference's "überfällige Termine rot" for the Fälligkeit column.
function isOverdue(task: ListTask): boolean {
  if (!task.dueDate || task.statusCategory === "done") return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

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
  priorityOptions,
  priorityFieldId,
}: {
  projectId: string;
  tasks: ListTask[];
  statuses: (NewTaskModalStatusOption & { category: string })[];
  users: NewTaskModalUserOption[];
  customFields: NewTaskModalCustomField[];
  templates?: NewTaskModalTaskOption[];
  taskLists?: ListTaskListOption[];
  savedViews?: SavedViewRecord[];
  currentUserId: string;
  priorityOptions: string[];
  priorityFieldId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(EMPTY_FILTER_GROUP);
  const [groupBy, setGroupBy] = useState<GroupKey>("status");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [titleQuery, setTitleQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
  // Reference §03 "Inline-Edit: Fast jedes Feld direkt editierbar ... Auto-Save"
  // — local optimistic copy of `tasks`, reset whenever the server-provided
  // prop changes (e.g. after router.refresh() from a bulk action). Adjusted
  // during render (React's documented "resetting state when a prop changes"
  // pattern) instead of an effect, so it can't trigger a cascading extra
  // render.
  const [localTasks, setLocalTasks] = useState(tasks);
  const [prevTasksProp, setPrevTasksProp] = useState(tasks);
  const [savingId, setSavingId] = useState<string | null>(null);
  if (tasks !== prevTasksProp) {
    setPrevTasksProp(tasks);
    setLocalTasks(tasks);
  }

  async function patchTask(taskId: string, fields: Record<string, unknown>, optimistic: Partial<ListTask>) {
    setLocalTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...optimistic } : task)));
    setSavingId(taskId);
    const response = await fetch(`/api/tenant/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    setSavingId(null);
    if (!response.ok) router.refresh();
  }

  async function patchPriority(taskId: string, value: string) {
    setLocalTasks((current) => current.map((task) => (task.id === taskId ? { ...task, priority: value } : task)));
    setSavingId(taskId);
    const response = await fetch(`/api/tenant/tasks/${taskId}/custom-fields/${priorityFieldId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setSavingId(null);
    if (!response.ok) router.refresh();
  }

  // Reference §03: "leere Felder mit Platzhaltern ('Add …'); Klick bearbeitet
  // direkt in der Zeile (Auto-Save)" — List-Layout war zuvor rein lesend
  // (nur Table-Layout hatte Inline-Edit); jetzt dieselbe Mechanik hier.
  function renderEditableCell(key: ColumnKey, task: ListTask) {
    switch (key) {
      case "assignee":
        return (
          <Select
            value={task.assigneeId ?? "__none__"}
            onValueChange={(value) => {
              const assigneeId = value === "__none__" ? null : value;
              const assignee = value === "__none__" ? null : (users.find((u) => u.id === value)?.label ?? null);
              patchTask(task.id, { assigneeId }, { assigneeId, assignee });
            }}
          >
            <SelectTrigger className="h-8 w-full border-transparent bg-transparent px-1.5 text-muted-foreground hover:border-input">
              <SelectValue>{task.assignee ?? <span className="text-muted-foreground/60">+ Assignee</span>}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— niemand —</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "startDate":
      case "dueDate": {
        const value = key === "startDate" ? task.startDate : task.dueDate;
        const overdue = key === "dueDate" && isOverdue(task);
        return (
          <Input
            type="date"
            defaultValue={value ? value.slice(0, 10) : ""}
            onChange={(event) =>
              patchTask(task.id, { [key]: event.target.value || null }, { [key]: event.target.value || null })
            }
            className={cn("h-8 border-transparent bg-transparent px-1 text-muted-foreground hover:border-input", overdue && "text-destructive")}
          />
        );
      }
      case "priority":
        return (
          <Select value={task.priority || "__none__"} onValueChange={(value) => patchPriority(task.id, value === "__none__" ? "" : value)}>
            <SelectTrigger className="h-8 w-full border-transparent bg-transparent px-1.5 hover:border-input">
              <SelectValue>
                {task.priority ? <PriorityPill value={task.priority} /> : <span className="text-muted-foreground/60">+ Priorität</span>}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {priorityOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
    }
  }

  function moveColumn(key: ColumnKey, direction: -1 | 1) {
    setColumnOrder((current) => {
      const index = current.indexOf(key);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }
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

  const statuses = useMemo(() => Array.from(new Set(localTasks.map((t) => t.status))), [localTasks]);
  const parentTaskOptions: NewTaskModalTaskOption[] = useMemo(
    () => localTasks.map((t) => ({ id: t.id, title: t.title })),
    [localTasks],
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
      {
        value: "priority",
        label: "Priorität",
        type: "select",
        options: priorityOptions.map((option) => ({ value: option, label: option })),
      },
    ],
    [statuses, users, priorityOptions],
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
      case "priority":
        return task.priority;
      default:
        return undefined;
    }
  }

  const visibleTasks = useMemo(() => {
    let filtered = localTasks.filter((t) => evaluateFilterNode(filterGroup, (field) => getTaskFieldValue(t, field)));
    const query = titleQuery.trim().toLowerCase();
    if (query.length > 0) {
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(query));
    }
    return [...filtered].sort((a, b) => {
      const aValue = a[sortKey] ?? "";
      const bValue = b[sortKey] ?? "";
      return sortDir === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  }, [localTasks, sortKey, sortDir, filterGroup, titleQuery]);

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
  // Order by first appearance in `users` (already createdAt-ordered from the
  // server) so the assignee grouping is stable, not re-sorted on every edit.
  const assigneeOrder = useMemo(() => [...users.map((u) => u.id), NO_ASSIGNEE_KEY], [users]);
  const userLabelById = useMemo(() => new Map(users.map((u) => [u.id, u.label])), [users]);

  const groups = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "__all__", label: null as string | null, category: null as string | null, avatarLabel: null as string | null, tasks: visibleTasks }];
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
            avatarLabel: null as string | null,
            tasks: groupTasks,
          };
        })
        .filter((group) => group.tasks.length > 0);
    }
    if (groupBy === "assignee") {
      // Reference §03: "Gruppierung mit Zähler ... jede Gruppe mit Avatar + Count."
      return assigneeOrder
        .map((userId) => {
          const groupTasks = visibleTasks.filter((t) => (t.assigneeId ?? NO_ASSIGNEE_KEY) === userId);
          const label = userId === NO_ASSIGNEE_KEY ? "Kein Assignee" : (userLabelById.get(userId) ?? "Kein Assignee");
          return {
            key: userId,
            label,
            category: null as string | null,
            avatarLabel: userId === NO_ASSIGNEE_KEY ? null : label,
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
        avatarLabel: null as string | null,
        tasks: groupTasks,
      };
    });
  }, [groupBy, groupOrder, visibleTasks, taskLists, listLabelById, assigneeOrder, userLabelById]);

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
    if (sortConfig.sortDir === "asc" || sortConfig.sortDir === "desc") {
      setSortDir(sortConfig.sortDir);
    }
    if (typeof sortConfig.groupBy === "string") {
      setGroupBy(sortConfig.groupBy as GroupKey);
    }
    if (Array.isArray(sortConfig.columnOrder)) {
      const validKeys = sortConfig.columnOrder.filter((key): key is ColumnKey =>
        ALL_COLUMNS.some((column) => column.key === key),
      );
      // A saved view predating a newly added column (e.g. "priority") would otherwise
      // silently drop it — append any column missing from the persisted order.
      const missing = DEFAULT_COLUMN_ORDER.filter((key) => !validKeys.includes(key));
      setColumnOrder([...validKeys, ...missing]);
    }
    if (sortConfig.visibleColumns && typeof sortConfig.visibleColumns === "object") {
      setVisibleColumns((current) => ({ ...current, ...(sortConfig.visibleColumns as Record<ColumnKey, boolean>) }));
    }
  }

  return (
    <div className="pb-10">
      <h1 className="mb-3 text-2xl font-bold tracking-tight">Liste</h1>
      <ListToolbar
        viewSelector={
          <SavedViewsBar
            scope="project"
            projectId={projectId}
            initialViews={savedViews}
            currentUserId={currentUserId}
            allowSharing
            getCurrentConfig={() => ({
              viewType: "list",
              filterConfig: filterGroup as unknown as Record<string, unknown>,
              sortConfig: { sortKey, sortDir, groupBy, columnOrder, visibleColumns },
            })}
            onApply={applySavedView}
          />
        }
        search={
          <div className="relative w-64 max-w-full">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={titleQuery}
              onChange={(event) => setTitleQuery(event.target.value)}
              placeholder="Titel durchsuchen…"
              className="h-9 pl-8"
            />
          </div>
        }
        fields={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Rows3 className="size-4" />
                Fields {Object.values(visibleColumns).filter(Boolean).length}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sichtbare Felder</div>
              <div className="flex flex-col gap-1">
                {columnOrder.map((key, index) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <label className="flex flex-1 items-center gap-2 text-sm">
                      <Checkbox
                        checked={visibleColumns[key]}
                        onCheckedChange={(checked) => setVisibleColumns((current) => ({ ...current, [key]: checked === true }))}
                      />
                      {COLUMN_LABEL[key]}
                    </label>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${COLUMN_LABEL[key]} nach oben`}
                      disabled={index === 0}
                      onClick={() => moveColumn(key, -1)}
                    >
                      <ChevronUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${COLUMN_LABEL[key]} nach unten`}
                      disabled={index === columnOrder.length - 1}
                      onClick={() => moveColumn(key, 1)}
                    >
                      <ChevronDown className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        }
        filters={<FilterBuilderPopover fields={filterFields} value={filterGroup} onChange={setFilterGroup} />}
        group={
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupKey)}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Group: Status</SelectItem>
              <SelectItem value="assignee">Group: Assignee</SelectItem>
              <SelectItem value="list">Group: Liste</SelectItem>
              <SelectItem value="none">Group: Kein</SelectItem>
            </SelectContent>
          </Select>
        }
        sort={
          <>
            <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
              <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Sort: Titel</SelectItem>
                <SelectItem value="status">Sort: Status</SelectItem>
                <SelectItem value="assignee">Sort: Assignee</SelectItem>
                <SelectItem value="dueDate">Sort: Fälligkeit</SelectItem>
              </SelectContent>
            </Select>
            <SortDirectionButton direction={sortDir} onToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} />
          </>
        }
        automate={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/organization/automations">
              <Zap className="size-4" />
              Automate
            </Link>
          </Button>
        }
        exportAction={
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
        }
        secondaryActions={
          <Button variant="outline" size="sm" onClick={() => setImportingCsv(true)}>
            <Upload className="size-4" />
            CSV importieren
          </Button>
        }
        primaryAction={
          <Button size="sm" onClick={() => setCreating((current) => !current)}>
            <Plus className="size-4" />
            Task
          </Button>
        }
      />

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
                {columnOrder.filter((key) => visibleColumns[key]).map((key) => (
                  <TableHead key={key}>{COLUMN_LABEL[key]}</TableHead>
                ))}
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
                            {/* Reference §03: "jede Gruppe mit Avatar + Count" (Assignee-Gruppierung). */}
                            {group.avatarLabel && <Avatar name={group.avatarLabel} email={group.avatarLabel} size={20} />}
                            <LegendKey label={group.label} category={group.category ?? undefined} />
                            <span className="text-xs text-muted-foreground">{group.tasks.length}</span>
                          </button>
                        </TableCell>
                      </TableRow>
                    )}
                    {!isCollapsed &&
                      group.tasks.map((task) => (
                        <TableRow key={task.id} className={cn(savingId === task.id && "opacity-60")}>
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
                            {/* Reference §03: "Status-Quadrat links je Task (Workflow-Status-Farbe)". */}
                            <StatusSquare category={task.statusCategory} className="mr-2 inline-block" />
                            {task.isKeyTask && <Sparkles className="mr-1.5 inline size-3.5 text-primary" aria-label="Key Task" />}
                            <Link href={`/projects/${projectId}/tasks/${task.id}`} className="hover:text-primary hover:underline">
                              {task.title}
                            </Link>
                            {task.isPrivate && <Lock className="ml-1.5 inline size-3 text-muted-foreground" aria-label="Privat" />}
                          </TableCell>
                          <TableCell className="min-w-36">
                            <Select
                              value={task.statusId}
                              onValueChange={(value) => {
                                const status = statusOptions.find((s) => s.id === value);
                                patchTask(
                                  task.id,
                                  { statusId: value },
                                  { statusId: value, status: status?.name ?? task.status, statusCategory: status?.category ?? task.statusCategory },
                                );
                              }}
                            >
                              <SelectTrigger className="h-8 w-full border-transparent bg-transparent hover:border-input">
                                <SelectValue>
                                  <LegendKey label={task.status} category={task.statusCategory} />
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((status) => (
                                  <SelectItem key={status.id} value={status.id}>
                                    {status.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {columnOrder
                            .filter((key) => visibleColumns[key])
                            .map((key) => (
                              <TableCell key={key} className="min-w-32 text-muted-foreground">
                                {renderEditableCell(key, task)}
                              </TableCell>
                            ))}
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
