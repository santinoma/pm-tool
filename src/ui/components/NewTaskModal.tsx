"use client";

import { useState } from "react";
import { Button } from "@/ui/shadcn/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/components/dialog";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Textarea } from "@/ui/shadcn/components/textarea";
import { CustomFieldInput, type CustomFieldInputType } from "@/ui/components/CustomFieldInput";

export interface NewTaskModalStatusOption {
  id: string;
  name: string;
}

export interface NewTaskModalUserOption {
  id: string;
  label: string;
}

export interface NewTaskModalCustomField {
  id: string;
  label: string;
  type: CustomFieldInputType;
  options: string[];
}

export interface NewTaskModalTaskOption {
  id: string;
  title: string;
}

export interface NewTaskModalTaskListOption {
  id: string;
  label: string;
}

export function NewTaskModal({
  projectId,
  statuses,
  users,
  customFields,
  tasks,
  templates = [],
  taskLists = [],
  onClose,
  onCreated,
}: {
  projectId: string;
  statuses: NewTaskModalStatusOption[];
  users: NewTaskModalUserOption[];
  customFields: NewTaskModalCustomField[];
  tasks: NewTaskModalTaskOption[];
  templates?: NewTaskModalTaskOption[];
  taskLists?: NewTaskModalTaskListOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [templateTaskId, setTemplateTaskId] = useState("__none__");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState(statuses.find((s) => s.name)?.id ?? statuses[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState("__none__");
  const [taskListGroupId, setTaskListGroupId] = useState("__none__");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [parentTaskId, setParentTaskId] = useState("__none__");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (title.trim().length === 0 && templateTaskId === "__none__") {
      setError("Titel ist erforderlich.");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch("/api/tenant/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || undefined,
        projectId,
        description: description || undefined,
        statusId: statusId || undefined,
        assigneeId: assigneeId !== "__none__" ? assigneeId : undefined,
        taskListGroupId: taskListGroupId !== "__none__" ? taskListGroupId : undefined,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        parentTaskId: parentTaskId !== "__none__" ? parentTaskId : undefined,
        templateTaskId: templateTaskId !== "__none__" ? templateTaskId : undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setSaving(false);
      setError(data.error ?? "Task konnte nicht angelegt werden.");
      return;
    }

    const taskId = data.task.id;
    await Promise.all(
      Object.entries(customValues)
        .filter(([, value]) => value.trim().length > 0)
        .map(([fieldId, value]) =>
          fetch(`/api/tenant/tasks/${taskId}/custom-fields/${fieldId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value }),
          }),
        ),
    );

    setSaving(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Neuer Task</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {templates.length > 0 && (
            <div>
              <Label htmlFor="new-task-template" className="mb-2 block">
                Vorlage
              </Label>
              <Select value={templateTaskId} onValueChange={setTemplateTaskId}>
                <SelectTrigger id="new-task-template" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Kein —</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="new-task-title" className="mb-2 block">
              Titel
            </Label>
            <Input id="new-task-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </div>

          <div>
            <Label htmlFor="new-task-description" className="mb-2 block">
              Beschreibung
            </Label>
            <Textarea id="new-task-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>

          {taskLists.length > 0 && (
            <div>
              <Label htmlFor="new-task-list" className="mb-2 block">
                Liste
              </Label>
              <Select value={taskListGroupId} onValueChange={setTaskListGroupId}>
                <SelectTrigger id="new-task-list" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Ohne Liste —</SelectItem>
                  {taskLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="new-task-status" className="mb-2 block">
                Status
              </Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger id="new-task-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="new-task-assignee" className="mb-2 block">
                Assignee
              </Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="new-task-assignee" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Niemand —</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="new-task-start" className="mb-2 block">
                Startdatum
              </Label>
              <Input id="new-task-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="new-task-due" className="mb-2 block">
                Fälligkeitsdatum
              </Label>
              <Input id="new-task-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="new-task-estimate" className="mb-2 block">
                Geschätzte Stunden
              </Label>
              <Input
                id="new-task-estimate"
                type="number"
                step="0.5"
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
              />
            </div>
          </div>

          {tasks.length > 0 && (
            <div>
              <Label htmlFor="new-task-parent" className="mb-2 block">
                Übergeordneter Task (Subtask von)
              </Label>
              <Select value={parentTaskId} onValueChange={setParentTaskId}>
                <SelectTrigger id="new-task-parent" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Kein übergeordneter Task —</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {customFields.map((field) => (
            <div key={field.id}>
              <Label htmlFor={`new-task-cf-${field.id}`} className="mb-2 block">
                {field.label}
              </Label>
              <CustomFieldInput
                id={`new-task-cf-${field.id}`}
                field={field}
                value={customValues[field.id] ?? ""}
                onChange={(value) => setCustomValues((current) => ({ ...current, [field.id]: value }))}
                users={users}
              />
            </div>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Wird angelegt…" : "Task anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
