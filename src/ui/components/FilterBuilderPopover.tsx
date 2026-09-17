"use client";

import { Filter, Plus, X } from "lucide-react";
import type { FilterCondition, FilterGroup, FilterOperator } from "@/tenant/views/filterEngine";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

export type FilterFieldType = "text" | "select" | "boolean";

export interface FilterFieldOption {
  value: string;
  label: string;
  type: FilterFieldType;
  options?: { value: string; label: string }[];
}

// V1 stays a single flat AND/OR group over simple conditions — the underlying
// filterEngine already supports arbitrarily nested groups for a future richer
// builder, but the fields available on any current list (status, assignee,
// title, ...) don't yet justify the extra UI complexity of nested groups.
const OPERATORS_BY_TYPE: Record<FilterFieldType, { value: FilterOperator; label: string }[]> = {
  text: [
    { value: "contains", label: "enthält" },
    { value: "not_contains", label: "enthält nicht" },
    { value: "is_empty", label: "ist leer" },
    { value: "is_not_empty", label: "ist nicht leer" },
  ],
  select: [
    { value: "equals", label: "ist" },
    { value: "not_equals", label: "ist nicht" },
    { value: "is_empty", label: "ist leer" },
    { value: "is_not_empty", label: "ist nicht leer" },
  ],
  boolean: [{ value: "equals", label: "ist" }],
};

function defaultConditionFor(field: FilterFieldOption): FilterCondition {
  const operator = OPERATORS_BY_TYPE[field.type][0].value;
  if (field.type === "select") {
    return { field: field.value, operator, value: field.options?.[0]?.value ?? "" };
  }
  if (field.type === "boolean") {
    return { field: field.value, operator, value: true };
  }
  return { field: field.value, operator, value: "" };
}

function ConditionValueInput({
  field,
  condition,
  onChange,
}: {
  field: FilterFieldOption;
  condition: FilterCondition;
  onChange: (value: unknown) => void;
}) {
  if (condition.operator === "is_empty" || condition.operator === "is_not_empty") {
    return null;
  }
  if (field.type === "select") {
    return (
      <Select value={typeof condition.value === "string" ? condition.value : ""} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (field.type === "boolean") {
    return (
      <Select value={condition.value === true ? "true" : "false"} onValueChange={(value) => onChange(value === "true")}>
        <SelectTrigger className="h-8 w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Ja</SelectItem>
          <SelectItem value="false">Nein</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      value={typeof condition.value === "string" ? condition.value : ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Wert…"
      className="h-8 text-sm"
    />
  );
}

/** Generic AND/OR filter-condition builder over a single flat FilterGroup — see filterEngine.ts for evaluation. */
export function FilterBuilderPopover({
  fields,
  value,
  onChange,
}: {
  fields: FilterFieldOption[];
  value: FilterGroup;
  onChange: (group: FilterGroup) => void;
}) {
  const conditions = value.rules.filter((rule): rule is FilterCondition => !("logic" in rule));

  function updateCondition(index: number, patch: Partial<FilterCondition>) {
    const nextConditions = conditions.map((condition, i) => (i === index ? { ...condition, ...patch } : condition));
    onChange({ ...value, rules: nextConditions });
  }

  function addCondition() {
    const field = fields[0];
    if (!field) return;
    onChange({ ...value, rules: [...conditions, defaultConditionFor(field)] });
  }

  function removeCondition(index: number) {
    onChange({ ...value, rules: conditions.filter((_, i) => i !== index) });
  }

  function fieldOf(name: string): FilterFieldOption | undefined {
    return fields.find((f) => f.value === name);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="size-4" />
          Filters
          {conditions.length > 0 && (
            <Badge variant="primaryOutline" className="ml-0.5 px-1.5 py-0">
              {conditions.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Filter</div>
          {conditions.length > 1 && (
            <Select value={value.logic} onValueChange={(logic) => onChange({ ...value, logic: logic as "AND" | "OR" })}>
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">Alle (AND)</SelectItem>
                <SelectItem value="OR">Eine (OR)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {conditions.length === 0 && <p className="mb-2 text-sm text-muted-foreground">Noch keine Filter.</p>}

        <div className="flex flex-col gap-2">
          {conditions.map((condition, index) => {
            const field = fieldOf(condition.field);
            if (!field) return null;
            return (
              <div key={index} className="flex items-center gap-1.5">
                <Select
                  value={condition.field}
                  onValueChange={(nextField) => {
                    const next = fieldOf(nextField);
                    if (next) updateCondition(index, defaultConditionFor(next));
                  }}
                >
                  <SelectTrigger className="h-8 w-28 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={condition.operator}
                  onValueChange={(operator) => updateCondition(index, { operator: operator as FilterOperator })}
                >
                  <SelectTrigger className="h-8 w-28 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS_BY_TYPE[field.type].map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="min-w-0 flex-1">
                  <ConditionValueInput field={field} condition={condition} onChange={(v) => updateCondition(index, { value: v })} />
                </div>
                <Button variant="ghost" size="icon-sm" aria-label="Filter entfernen" onClick={() => removeCondition(index)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>

        <Button variant="outline" size="sm" className="mt-2.5 w-full" onClick={addCondition} disabled={fields.length === 0}>
          <Plus className="size-3.5" />
          Filter hinzufügen
        </Button>
      </PopoverContent>
    </Popover>
  );
}
