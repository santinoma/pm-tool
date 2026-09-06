"use client";

import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

export type CustomFieldInputType = "text" | "number" | "select" | "multi_select" | "date" | "person" | "url" | "percent";

export interface CustomFieldInputDef {
  id: string;
  label: string;
  type: CustomFieldInputType;
  options: string[];
}

export interface CustomFieldInputUserOption {
  id: string;
  label: string;
}

/**
 * Renders the value control for a single custom field, dispatching on `field.type`.
 * Shared between task creation (NewTaskModal) and the task detail sidebar so both
 * stay in sync as new field types are added.
 */
export function CustomFieldInput({
  field,
  value,
  onChange,
  users,
  id,
}: {
  field: CustomFieldInputDef;
  value: string;
  onChange: (value: string) => void;
  users: CustomFieldInputUserOption[];
  id: string;
}) {
  if (field.type === "select" || field.type === "person") {
    return (
      <Select value={value || "__none__"} onValueChange={(next) => onChange(next === "__none__" ? "" : next)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">—</SelectItem>
          {field.type === "person"
            ? users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.label}
                </SelectItem>
              ))
            : field.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "date") {
    return <Input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.type === "percent") {
    return (
      <div className="relative">
        <Input id={id} type="number" min={0} max={100} value={value} onChange={(event) => onChange(event.target.value)} className="pr-7" />
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">%</span>
      </div>
    );
  }

  if (field.type === "url") {
    return <Input id={id} type="url" placeholder="https://…" value={value} onChange={(event) => onChange(event.target.value)} />;
  }

  return (
    <Input
      id={id}
      type={field.type === "number" ? "number" : "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** Read-only rendering of a stored custom field value, type-aware (e.g. url → link). */
export function CustomFieldValueDisplay({ type, value }: { type: CustomFieldInputType; value: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  if (type === "url") {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        {value}
      </a>
    );
  }
  if (type === "percent") {
    return <span>{value}%</span>;
  }
  return <span>{value}</span>;
}
