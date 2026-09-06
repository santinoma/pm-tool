"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { LegendKey } from "@/ui/components/LegendKey";
import { NewTaskModal, type NewTaskModalUserOption, type NewTaskModalCustomField, type NewTaskModalTaskOption } from "@/ui/components/NewTaskModal";

import { Button } from "@/ui/shadcn/components/button";
import { cn } from "@/ui/shadcn/lib/utils";

interface BoardStatus {
  id: string;
  name: string;
  category: string;
}

interface BoardTask {
  id: string;
  title: string;
  statusId: string;
  assignee: string | null;
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

  async function moveTask(taskId: string, statusId: string) {
    setLocalTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, statusId } : task)),
    );

    const response = await fetch(`/api/tenant/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId }),
    });
    if (!response.ok) {
      router.refresh();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 pb-4 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Board</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Neuer Task
        </Button>
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
              <span className="text-xs text-muted-foreground">{localTasks.filter((t) => t.statusId === status.id).length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {localTasks
                .filter((task) => task.statusId === status.id)
                .map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/task-id", task.id);
                    }}
                    className="cursor-grab rounded-md border bg-card p-3 text-sm shadow-xs transition-shadow hover:shadow-md"
                  >
                    <Link href={`/projects/${projectId}/tasks/${task.id}`} className="hover:text-primary">
                      {task.title}
                    </Link>
                    {task.assignee && <div className="mt-1 text-xs text-muted-foreground">{task.assignee}</div>}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
