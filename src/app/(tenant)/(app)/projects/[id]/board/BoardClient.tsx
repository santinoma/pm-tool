"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Plus, Zap } from "lucide-react";
import { LegendKey } from "@/ui/components/LegendKey";
import { NewTaskModal, type NewTaskModalUserOption, type NewTaskModalCustomField, type NewTaskModalTaskOption } from "@/ui/components/NewTaskModal";

import { Avatar, AvatarFallback } from "@/ui/shadcn/components/avatar";
import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { cn } from "@/ui/shadcn/lib/utils";
import { positionBetween } from "@/tenant/tasks/position";

interface BoardStatus {
  id: string;
  name: string;
  category: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  no_priority: "",
  low: "Niedrig",
  medium: "Mittel",
  high: "High",
  urgent: "Dringend",
};

interface BoardTask {
  id: string;
  title: string;
  statusId: string;
  position: number;
  assignee: string | null;
  priority: string;
  tShirtSize: string | null;
  estimatedHours: number | null;
}

export function BoardClient({
  projectId,
  statuses,
  tasks,
  users,
  customFields,
  templates = [],
}: {
  projectId: string;
  statuses: BoardStatus[];
  tasks: BoardTask[];
  users: NewTaskModalUserOption[];
  customFields: NewTaskModalCustomField[];
  templates?: NewTaskModalTaskOption[];
}) {
  const router = useRouter();
  const [localTasks, setLocalTasks] = useState(tasks);
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const parentTaskOptions: NewTaskModalTaskOption[] = useMemo(
    () => tasks.map((t) => ({ id: t.id, title: t.title })),
    [tasks],
  );

  async function moveTask(taskId: string, statusId: string, position?: number) {
    setLocalTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, statusId, ...(position !== undefined ? { position } : {}) } : task,
      ),
    );

    const response = await fetch(`/api/tenant/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId, ...(position !== undefined ? { position } : {}) }),
    });
    if (!response.ok) {
      router.refresh();
    }
  }

  // Reference "prioritize tasks inside a task list": dropping a card above/below
  // another one reorders it there instead of just appending to the column.
  function moveTaskBefore(taskId: string, statusId: string, columnTasks: BoardTask[], beforeIndex: number) {
    const draggedIndex = columnTasks.findIndex((t) => t.id === taskId);
    // Removing the dragged task (when it's already in this column) shifts every
    // index after it down by one, so the target slot needs the same correction.
    const adjustedBeforeIndex = draggedIndex !== -1 && draggedIndex < beforeIndex ? beforeIndex - 1 : beforeIndex;
    const others = columnTasks.filter((t) => t.id !== taskId);
    const before = others[adjustedBeforeIndex - 1]?.position;
    const after = others[adjustedBeforeIndex]?.position;
    void moveTask(taskId, statusId, positionBetween(before, after));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Board</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/organization/automations">
              <Zap className="size-4" />
              Automate
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/tenant/exports/csv?source=task-list&projectId=${encodeURIComponent(projectId)}`}>
              <Download className="size-4" />
              Export
            </a>
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Task
          </Button>
        </div>
      </div>
      {creating && (
        <NewTaskModal
          projectId={projectId}
          statuses={statuses}
          users={users}
          customFields={customFields}
          tasks={parentTaskOptions}
          templates={templates}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      <div className="flex items-start gap-4 overflow-x-auto px-4 pb-6 md:px-6">
        {statuses.map((status) => (
          <div
            key={status.id}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOverStatusId(status.id);
            }}
            onDragLeave={() => setDragOverStatusId(null)}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = event.dataTransfer.getData("text/task-id");
              setDragOverStatusId(null);
              if (taskId) {
                void moveTask(taskId, status.id);
              }
            }}
            className={cn(
              "min-w-64 shrink-0 rounded-lg border bg-muted/40 p-3 transition-colors",
              dragOverStatusId === status.id && "border-primary bg-primary/5",
            )}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <LegendKey label={status.name} category={status.category} />
              <Badge variant="secondary" className="rounded-full">
                {localTasks.filter((t) => t.statusId === status.id).length}
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              {localTasks
                .filter((task) => task.statusId === status.id)
                .sort((a, b) => a.position - b.position)
                .map((task, index, columnTasks) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/task-id", task.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDragOverStatusId(status.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const taskId = event.dataTransfer.getData("text/task-id");
                      setDragOverStatusId(null);
                      if (!taskId || taskId === task.id) return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      const droppedAfter = event.clientY > rect.top + rect.height / 2;
                      moveTaskBefore(taskId, status.id, columnTasks, droppedAfter ? index + 1 : index);
                    }}
                    className="flex cursor-grab flex-col gap-2 rounded-md border bg-card p-3 text-sm shadow-xs transition-shadow hover:shadow-md"
                  >
                    <Link href={`/projects/${projectId}/tasks/${task.id}`} className="font-medium hover:text-primary">
                      {task.title}
                    </Link>
                    {/* Reference card anatomy: Titel, ID, Estimate, Typ/Priority-Tags, Assignee-Avatar. */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {task.priority !== "no_priority" && (
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {PRIORITY_LABELS[task.priority] ?? task.priority}
                        </Badge>
                      )}
                      {task.tShirtSize && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {task.tShirtSize}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground/70">#T-{task.id.slice(0, 8).toUpperCase()}</span>
                      <div className="flex items-center gap-2">
                        {task.estimatedHours != null && (
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">{task.estimatedHours}h</span>
                        )}
                        {task.assignee && (
                          <Avatar className="size-5">
                            <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                              {task.assignee.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
