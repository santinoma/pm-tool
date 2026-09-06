/**
 * Report-Builder-Kern: reine Filter-/Gruppierungslogik über bereits geladene
 * Zeilen-Arrays (kein Prisma-Zugriff hier — die API-Route holt die Rohdaten,
 * dieses Modul filtert/gruppiert im Speicher). Bewusst klein gehalten: drei
 * feste Datenquellen (tasks, time_entries, budgets) statt einer generischen
 * Query-Engine — für ein Small-Team-Tool reicht das.
 */

export type ReportFilterOperator = "eq" | "neq" | "contains" | "gt" | "lt";

export interface ReportFilterConfig {
  field: string;
  operator: ReportFilterOperator;
  value: unknown;
}

export interface ReportGroupByConfig {
  field: string;
}

export interface ReportResult<Row> {
  groups: { key: string; rows: Row[] }[];
}

export interface TaskRow {
  id: string;
  title: string;
  status: string;
  statusCategory: string;
  assignee: string | null;
  project: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
}

export interface TimeEntryRow {
  id: string;
  user: string;
  project: string | null;
  task: string | null;
  durationMinutes: number | null;
  date: string | null;
}

export interface BudgetRow {
  id: string;
  title: string;
  project: string;
  budgetTotal: number;
  budgetUsed: number;
  budgetRemaining: number;
  usagePercent: number;
}

function normalizeForEquality(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toComparable(value: unknown): number | null {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    const numeric = Number(value);
    if (value.trim() !== "" && !Number.isNaN(numeric)) return numeric;
  }
  return null;
}

function matchesFilter(fieldValue: unknown, filter: ReportFilterConfig): boolean {
  switch (filter.operator) {
    case "eq":
      return normalizeForEquality(fieldValue) === normalizeForEquality(filter.value);
    case "neq":
      return normalizeForEquality(fieldValue) !== normalizeForEquality(filter.value);
    case "contains":
      if (fieldValue == null) return false;
      return String(fieldValue).toLowerCase().includes(String(filter.value ?? "").toLowerCase());
    case "gt": {
      const a = toComparable(fieldValue);
      const b = toComparable(filter.value);
      return a != null && b != null && a > b;
    }
    case "lt": {
      const a = toComparable(fieldValue);
      const b = toComparable(filter.value);
      return a != null && b != null && a < b;
    }
    default:
      return true;
  }
}

function runReport<Row>(
  rows: Row[],
  filters: ReportFilterConfig[],
  groupBy?: ReportGroupByConfig,
): ReportResult<Row> {
  const filtered = rows.filter((row) =>
    filters.every((filter) => matchesFilter((row as Record<string, unknown>)[filter.field], filter)),
  );

  if (!groupBy) {
    return { groups: [{ key: "Alle", rows: filtered }] };
  }

  const buckets = new Map<string, Row[]>();
  for (const row of filtered) {
    const raw = (row as Record<string, unknown>)[groupBy.field];
    const key = raw == null || raw === "" ? "—" : String(raw);
    const existing = buckets.get(key);
    if (existing) {
      existing.push(row);
    } else {
      buckets.set(key, [row]);
    }
  }

  const groups = Array.from(buckets.entries())
    .map(([key, groupRows]) => ({ key, rows: groupRows }))
    .sort((a, b) => a.key.localeCompare(b.key, "de"));

  return { groups };
}

export function runTasksReport(
  rows: TaskRow[],
  filters: ReportFilterConfig[],
  groupBy?: ReportGroupByConfig,
): ReportResult<TaskRow> {
  return runReport(rows, filters, groupBy);
}

export function runTimeEntriesReport(
  rows: TimeEntryRow[],
  filters: ReportFilterConfig[],
  groupBy?: ReportGroupByConfig,
): ReportResult<TimeEntryRow> {
  return runReport(rows, filters, groupBy);
}

export function runBudgetsReport(
  rows: BudgetRow[],
  filters: ReportFilterConfig[],
  groupBy?: ReportGroupByConfig,
): ReportResult<BudgetRow> {
  return runReport(rows, filters, groupBy);
}

export const REPORT_DATA_SOURCES = ["tasks", "time_entries", "budgets"] as const;
export type ReportDataSource = (typeof REPORT_DATA_SOURCES)[number];

export const REPORT_FIELDS: Record<ReportDataSource, { field: string; label: string }[]> = {
  tasks: [
    { field: "title", label: "Titel" },
    { field: "status", label: "Status" },
    { field: "statusCategory", label: "Status-Kategorie" },
    { field: "assignee", label: "Assignee" },
    { field: "project", label: "Projekt" },
    { field: "dueDate", label: "Fälligkeit" },
    { field: "estimatedHours", label: "Geschätzte Stunden" },
  ],
  time_entries: [
    { field: "user", label: "Nutzer" },
    { field: "project", label: "Projekt" },
    { field: "task", label: "Task" },
    { field: "durationMinutes", label: "Dauer (Min.)" },
    { field: "date", label: "Datum" },
  ],
  budgets: [
    { field: "title", label: "Titel" },
    { field: "project", label: "Projekt" },
    { field: "budgetTotal", label: "Budget gesamt" },
    { field: "budgetUsed", label: "Budget verbraucht" },
    { field: "budgetRemaining", label: "Budget verbleibend" },
    { field: "usagePercent", label: "Auslastung %" },
  ],
};
