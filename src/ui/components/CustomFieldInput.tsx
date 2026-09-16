"use client";

import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

function parseMultiSelectValue(value: string): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

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

  if (field.type === "multi_select") {
    const selected = parseMultiSelectValue(value);
    function toggle(option: string) {
      const next = selected.includes(option) ? selected.filter((entry) => entry !== option) : [...selected, option];
      onChange(JSON.stringify(next));
    }
    return (
      <div id={id} className="flex flex-col gap-1.5 rounded-md border p-2.5">
        {field.options.length === 0 && <span className="text-sm text-muted-foreground">Keine Optionen definiert.</span>}
        {field.options.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={selected.includes(option)} onCheckedChange={() => toggle(option)} />
            {option}
          </label>
        ))}
      </div>
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
  if (type === "multi_select") {
    const selected = parseMultiSelectValue(value);
    return <span>{selected.length > 0 ? selected.join(", ") : "—"}</span>;
  }
  return <span>{value}</span>;
}
