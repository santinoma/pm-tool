"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Lock, Sparkles } from "lucide-react";
import { LegendKey } from "@/ui/components/LegendKey";

import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

interface TableTask {
  id: string;
  title: string;
  statusId: string;
  statusName: string;
  statusCategory: string;
  assigneeId: string | null;
  assignee: string | null;
  priority: string;
  tShirtSize: string | null;
  estimatedHours: number | null;
  startDate: string | null;
  dueDate: string | null;
  isKeyTask: boolean;
  isPrivate: boolean;
}

type SortKey = "title" | "statusName" | "assignee" | "priority" | "estimatedHours" | "startDate" | "dueDate";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// Reference "Table Layout": flat spreadsheet of every task in the project, no
// grouping bands — the distinct-from-List layout Productive documents, plus its
// "Inline Editing" behavior (click a cell, change the value, no need to open the task).
export function TableViewClient({
  projectId,
  tasks,
  statuses,
  users,
  priorityFieldId,
  priorityOptions,
}: {
  projectId: string;
  tasks: TableTask[];
  statuses: { id: string; name: string; category: string }[];
  users: { id: string; label: string }[];
  priorityFieldId: string;
  priorityOptions: string[];
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [localTasks, setLocalTasks] = useState(tasks);
  const [savingId, setSavingId] = useState<string | null>(null);

  const sortedTasks = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...localTasks].sort((a, b) => {
      const aValue = a[sortKey] ?? "";
      const bValue = b[sortKey] ?? "";
      if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * dir;
      return String(aValue).localeCompare(String(bValue)) * dir;
    });
  }, [localTasks, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function patchTask(taskId: string, fields: Record<string, unknown>, optimistic: Partial<TableTask>) {
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

  async function patchCustomFieldValue(taskId: string, fieldId: string, value: string, optimistic: Partial<TableTask>) {
    setLocalTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...optimistic } : task)));
    setSavingId(taskId);
    const response = await fetch(`/api/tenant/tasks/${taskId}/custom-fields/${fieldId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setSavingId(null);
    if (!response.ok) router.refresh();
  }

  function renderSortHead(sortKeyValue: SortKey, label: string, className?: string) {
    const isActive = sortKey === sortKeyValue;
    return (
      <TableHead className={className}>
        <button type="button" onClick={() => toggleSort(sortKeyValue)} className="flex items-center gap-1 hover:text-foreground">
          {label}
          {isActive && (sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
        </button>
      </TableHead>
    );
  }

  return (
    <div className="px-4 pb-10 md:px-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tabelle</h1>
        <span className="text-sm text-muted-foreground">{sortedTasks.length} Task(s)</span>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Keine Tasks</h3>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {renderSortHead("title", "Titel")}
                {renderSortHead("statusName", "Status")}
                {renderSortHead("assignee", "Assignee")}
                {renderSortHead("priority", "Priorität")}
                {renderSortHead("estimatedHours", "Estimate", "text-right")}
                {renderSortHead("startDate", "Start")}
                {renderSortHead("dueDate", "Fälligkeit")}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.map((task) => (
                <TableRow key={task.id} className={cn(savingId === task.id && "opacity-60")}>
                  <TableCell className="font-medium">
                    {task.isKeyTask && <Sparkles className="mr-1.5 inline size-3.5 text-primary" aria-label="Key Task" />}
                    <Link href={`/projects/${projectId}/tasks/${task.id}`} className="hover:text-primary hover:underline">
                      {task.title}
                    </Link>
                    {task.isPrivate && <Lock className="ml-1.5 inline size-3 text-muted-foreground" aria-label="Privat" />}
                  </TableCell>
                  <TableCell className="min-w-36">
                    <Select value={task.statusId} onValueChange={(value) => {
                      const status = statuses.find((s) => s.id === value);
                      patchTask(task.id, { statusId: value }, { statusId: value, statusName: status?.name ?? task.statusName, statusCategory: status?.category ?? task.statusCategory });
                    }}>
                      <SelectTrigger className="h-8 w-full border-transparent bg-transparent hover:border-input">
                        <SelectValue>
                          <LegendKey label={task.statusName} category={task.statusCategory} />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="min-w-36">
                    <Select
                      value={task.assigneeId ?? "__none__"}
                      onValueChange={(value) => {
                        const assigneeId = value === "__none__" ? null : value;
                        const assignee = value === "__none__" ? null : (users.find((u) => u.id === value)?.label ?? null);
                        patchTask(task.id, { assigneeId }, { assigneeId, assignee });
                      }}
                    >
                      <SelectTrigger className="h-8 w-full border-transparent bg-transparent text-muted-foreground hover:border-input">
                        <SelectValue />
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
                  </TableCell>
                  <TableCell className="min-w-32">
                    <Select
                      value={task.priority || "__none__"}
                      onValueChange={(value) =>
                        patchCustomFieldValue(task.id, priorityFieldId, value === "__none__" ? "" : value, {
                          priority: value === "__none__" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-full border-transparent bg-transparent text-muted-foreground hover:border-input">
                        <SelectValue>{task.priority || "—"}</SelectValue>
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
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {task.estimatedHours != null ? `${task.estimatedHours}h` : "—"}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      defaultValue={toDateInputValue(task.startDate)}
                      onChange={(event) =>
                        patchTask(task.id, { startDate: event.target.value || null }, { startDate: event.target.value || null })
                      }
                      className="h-8 border-transparent bg-transparent px-1 text-muted-foreground hover:border-input"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      defaultValue={toDateInputValue(task.dueDate)}
                      onChange={(event) =>
                        patchTask(task.id, { dueDate: event.target.value || null }, { dueDate: event.target.value || null })
                      }
                      className="h-8 border-transparent bg-transparent px-1 text-muted-foreground hover:border-input"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
