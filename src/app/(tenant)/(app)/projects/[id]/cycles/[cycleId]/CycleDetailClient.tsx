"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LegendKey } from "@/ui/components/LegendKey";

import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/shadcn/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

interface CycleTaskRow {
  id: string;
  title: string;
  statusName: string;
  statusCategory: "not_started" | "started" | "done";
  estimatedHours: number | null;
  assigneeLabel: string | null;
  isScopeCreep: boolean;
}

interface Insights {
  totalTasks: number;
  doneTasks: number;
  velocity: number;
  plannedScopeHours: number;
  scopeCreepHours: number;
  scopeCreepPercent: number;
}

export function CycleDetailClient({
  projectId,
  cycle,
  insights,
  tasks,
  availableTasks,
}: {
  projectId: string;
  cycle: { id: string; name: string; startDate: string; endDate: string };
  insights: Insights;
  tasks: CycleTaskRow[];
  availableTasks: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState(availableTasks[0]?.id ?? "");

  async function assignTask(taskId: string) {
    await fetch(`/api/tenant/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycleId: cycle.id }),
    });
    router.refresh();
  }

  async function removeTask(taskId: string) {
    await fetch(`/api/tenant/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycleId: null }),
    });
    router.refresh();
  }

  return (
    <div className="pb-10">
      <Link href={`/projects/${projectId}/cycles`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Alle Cycles
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-bold tracking-tight">{cycle.name}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {cycle.startDate} – {cycle.endDate}
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-lg font-semibold">{insights.velocity}h</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {insights.doneTasks}/{insights.totalTasks} Tasks erledigt
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Scope Creep</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-lg font-semibold">{insights.scopeCreepPercent.toFixed(1)}%</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {insights.scopeCreepHours}h nachträglich / {insights.plannedScopeHours}h geplant
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Tasks im Cycle</h2>
      {tasks.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Noch keine Tasks zugeordnet.</p>
      ) : (
        <div className="mb-8 overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Zuständig</TableHead>
                <TableHead>Std.</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    <LegendKey label={task.statusName} category={task.statusCategory} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{task.assigneeLabel ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{task.estimatedHours ?? "—"}</TableCell>
                  <TableCell>{task.isScopeCreep ? <LegendKey label="Scope Creep" variant="warning" /> : "Geplant"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => removeTask(task.id)}>
                      Entfernen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Task hinzufügen</h2>
      {availableTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine weiteren Tasks im Projekt verfügbar.</p>
      ) : (
        <div className="flex items-center gap-3">
          <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableTasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => assignTask(selectedTaskId)}>Zum Cycle hinzufügen</Button>
        </div>
      )}
    </div>
  );
}
