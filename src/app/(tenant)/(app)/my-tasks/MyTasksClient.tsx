"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LegendKey } from "@/ui/components/LegendKey";
import { buildMonthGrid, getUtcDateKey } from "@/tenant/projects/dateUtils";
import { SavedViewsBar, type SavedViewRecord } from "@/ui/components/SavedViewsBar";
import { FilterBuilderPopover, type FilterFieldOption } from "@/ui/components/FilterBuilderPopover";
import { SortDirectionButton, type SortDirection } from "@/ui/components/SortDirectionButton";
import { evaluateFilterNode, resolveDynamicPlaceholders, parseFilterConfig, type FilterGroup } from "@/tenant/views/filterEngine";

import { Button } from "@/ui/shadcn/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

const EMPTY_FILTER_GROUP: FilterGroup = { logic: "AND", rules: [] };

interface MyTask {
  id: string;
  title: string;
  status: string;
  statusCategory: string;
  projectId: string | null;
  projectName: string;
  dueDate: string | null;
}

type SortKey = "title" | "status" | "projectName" | "dueDate";
type ViewMode = "list" | "board" | "calendar";

const CATEGORY_COLUMNS: { key: string; label: string }[] = [
  { key: "not_started", label: "Nicht begonnen" },
  { key: "started", label: "In Arbeit" },
  { key: "done", label: "Erledigt" },
];

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function MyTasksClient({
  tasks,
  savedViews = [],
  currentUserId,
}: {
  tasks: MyTask[];
  savedViews?: SavedViewRecord[];
  currentUserId: string;
}) {
  const [view, setView] = useState<ViewMode>("list");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(EMPTY_FILTER_GROUP);

  const statuses = useMemo(() => Array.from(new Set(tasks.map((t) => t.status))), [tasks]);
  const filterFields: FilterFieldOption[] = useMemo(
    () => [
      { value: "status", label: "Status", type: "select", options: statuses.map((s) => ({ value: s, label: s })) },
      {
        value: "projectName",
        label: "Projekt",
        type: "select",
        options: Array.from(new Set(tasks.map((t) => t.projectName))).map((name) => ({ value: name, label: name })),
      },
    ],
    [statuses, tasks],
  );

  function applySavedView(savedView: SavedViewRecord) {
    if (savedView.viewType === "list" || savedView.viewType === "board" || savedView.viewType === "calendar") {
      setView(savedView.viewType);
    }
    const parsedGroup = parseFilterConfig(savedView.filterConfig);
    setFilterGroup(resolveDynamicPlaceholders(parsedGroup, currentUserId) as FilterGroup);
    const sortConfig = savedView.sortConfig ?? {};
    if (typeof sortConfig.sortKey === "string") {
      setSortKey(sortConfig.sortKey as SortKey);
    }
    if (sortConfig.sortDir === "asc" || sortConfig.sortDir === "desc") {
      setSortDir(sortConfig.sortDir);
    }
  }

  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((t) =>
      evaluateFilterNode(filterGroup, (field) => (field === "status" ? t.status : field === "projectName" ? t.projectName : undefined)),
    );
    return [...filtered].sort((a, b) => {
      const aValue = a[sortKey] ?? "";
      const bValue = b[sortKey] ?? "";
      return sortDir === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  }, [tasks, sortKey, sortDir, filterGroup]);

  return (
    <div className="pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Meine Tasks</h1>
          <span className="text-sm text-muted-foreground">({tasks.length})</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border">
            {(["list", "board", "calendar"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  view === mode ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {mode === "list" ? "Liste" : mode === "board" ? "Board" : "Kalender"}
              </button>
            ))}
          </div>
          {view === "list" && (
            <>
              <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Sortieren: Titel</SelectItem>
                  <SelectItem value="status">Sortieren: Status</SelectItem>
                  <SelectItem value="projectName">Sortieren: Projekt</SelectItem>
                  <SelectItem value="dueDate">Sortieren: Fälligkeit</SelectItem>
                </SelectContent>
              </Select>
              <SortDirectionButton direction={sortDir} onToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} />
              <FilterBuilderPopover fields={filterFields} value={filterGroup} onChange={setFilterGroup} />
            </>
          )}
        </div>
      </div>

      <div className="mb-5">
        <SavedViewsBar
          scope="my_tasks"
          initialViews={savedViews}
          currentUserId={currentUserId}
          allowSharing={false}
          getCurrentConfig={() => ({
            viewType: view,
            filterConfig: filterGroup as unknown as Record<string, unknown>,
            sortConfig: { sortKey, sortDir },
          })}
          onApply={applySavedView}
        />
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Keine Tasks</h3>
          <p className="mt-1 text-sm text-muted-foreground">Dir sind aktuell keine Tasks zugewiesen.</p>
        </div>
      ) : view === "list" ? (
        <MyTasksListView tasks={visibleTasks} />
      ) : view === "board" ? (
        <MyTasksBoardView tasks={tasks} />
      ) : (
        <MyTasksCalendarView tasks={tasks} />
      )}
    </div>
  );
}

function taskHref(task: MyTask): string {
  return task.projectId ? `/projects/${task.projectId}/tasks/${task.id}` : "#";
}

function MyTasksListView({ tasks }: { tasks: MyTask[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, MyTask[]>();
    for (const task of tasks) {
      const list = map.get(task.projectName) ?? [];
      list.push(task);
      map.set(task.projectName, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Fälligkeit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(([projectName, groupTasks]) => (
            <ProjectGroupRows key={projectName} projectId={groupTasks[0].projectId} projectName={projectName} tasks={groupTasks} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ProjectGroupRows({
  projectId,
  projectName,
  tasks,
}: {
  projectId: string | null;
  projectName: string;
  tasks: MyTask[];
}) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={3} className="p-0">
          <div className="flex items-center justify-between px-4 py-2">
            {projectId ? (
              <Link href={`/projects/${projectId}/list`} className="text-sm font-semibold hover:text-primary">
                {projectName}
              </Link>
            ) : (
              <span className="text-sm font-semibold">{projectName}</span>
            )}
            <span className="text-xs text-muted-foreground">{tasks.length}</span>
          </div>
        </TableCell>
      </TableRow>
      {tasks.map((task) => (
        <TableRow key={task.id}>
          <TableCell>
            {task.projectId ? (
              <Link href={taskHref(task)} className="hover:text-primary hover:underline">
                {task.title}
              </Link>
            ) : (
              task.title
            )}
          </TableCell>
          <TableCell>
            <LegendKey label={task.status} category={task.statusCategory} />
          </TableCell>
          <TableCell className="text-muted-foreground">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("de-DE") : "—"}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

function MyTasksBoardView({ tasks }: { tasks: MyTask[] }) {
  return (
    <div className="flex items-start gap-4 overflow-x-auto pb-4">
      {CATEGORY_COLUMNS.map((column) => {
        const columnTasks = tasks.filter((task) => task.statusCategory === column.key);
        return (
          <div key={column.key} className="min-w-64 shrink-0 rounded-lg border bg-muted/40 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-semibold">{column.label}</span>
              <span className="text-xs text-muted-foreground">{columnTasks.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {columnTasks.map((task) => (
                <Link key={task.id} href={taskHref(task)} className="block rounded-md border bg-card p-3 text-sm shadow-xs hover:shadow-md">
                  <div>{task.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {task.projectName}
                    {task.dueDate ? ` · ${new Date(task.dueDate).toLocaleDateString("de-DE")}` : ""}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MyTasksCalendarView({ tasks }: { tasks: MyTask[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getUTCMonth());

  const days = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);
  const tasksByDay = useMemo(() => {
    const map = new Map<string, MyTask[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = getUtcDateKey(new Date(task.dueDate));
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  function goToPreviousMonth() {
    if (monthIndex === 0) {
      setYear((y) => y - 1);
      setMonthIndex(11);
    } else {
      setMonthIndex((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (monthIndex === 11) {
      setYear((y) => y + 1);
      setMonthIndex(0);
    } else {
      setMonthIndex((m) => m + 1);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
          <ChevronLeft className="size-4" />
          Vorheriger Monat
        </Button>
        <h2 className="min-w-52 text-center text-lg font-semibold">
          {new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" })}
        </h2>
        <Button variant="outline" size="sm" onClick={goToNextMonth}>
          Nächster Monat
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-muted/60 px-2 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = getUtcDateKey(day);
          const isCurrentMonth = day.getUTCMonth() === monthIndex;
          const dayTasks = tasksByDay.get(key) ?? [];
          return (
            <div key={key} className={cn("min-h-24 bg-background p-2", !isCurrentMonth && "bg-muted/30 opacity-60")}>
              <div className="font-mono text-xs text-muted-foreground">{day.getUTCDate()}</div>
              <div className="mt-1 flex flex-col gap-1">
                {dayTasks.map((task) => (
                  <Link key={task.id} href={taskHref(task)} className="block truncate rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    {task.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
