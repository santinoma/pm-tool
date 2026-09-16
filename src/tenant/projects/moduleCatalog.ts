export interface ModuleCatalogEntry {
  key: string;
  label: string;
  group: "Project management" | "Financials" | "More";
  real: boolean;
  /** Tasks ist immer aktiv und nicht abwählbar. */
  locked?: boolean;
  /** Nur wählbar, wenn der Tenant-Plan dieses Feature entitled. */
  requiresFeature?: string;
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  { key: "tasks", label: "Tasks", group: "Project management", real: true, locked: true },
  { key: "wiki", label: "Docs", group: "Project management", real: true },
  { key: "forms", label: "Forms", group: "Project management", real: false },
  { key: "meetings", label: "Meetings", group: "Project management", real: false },
  { key: "budgets", label: "Budgets & Invoices", group: "Financials", real: true, requiresFeature: "budgets_financials" },
  { key: "deals", label: "Deals", group: "Financials", real: false },
  { key: "expenses", label: "Expenses", group: "Financials", real: false },
  { key: "time", label: "Time", group: "Financials", real: true },
  { key: "cycles", label: "Cycles", group: "More", real: true, requiresFeature: "cycles_sprints" },
  { key: "baselines", label: "Baselines", group: "More", real: true, requiresFeature: "baseline_diffing" },
  { key: "hill_chart", label: "Hill Chart", group: "More", real: true },
  { key: "triage", label: "Triage", group: "More", real: true },
  { key: "check_ins", label: "Check-ins", group: "More", real: true },
  { key: "dashboard", label: "Dashboard", group: "More", real: false },
  { key: "resource_planning", label: "Resource planning", group: "More", real: false },
  { key: "reports", label: "Reports", group: "More", real: false },
  { key: "purchase_orders", label: "Purchase orders", group: "More", real: false },
  { key: "activity", label: "Activity", group: "More", real: true },
];

export const REAL_MODULE_KEYS = MODULE_CATALOG.filter((entry) => entry.real).map((entry) => entry.key);

/**
 * Bereinigt eine Modul-Auswahl: nur bekannte, echte Module bleiben übrig,
 * "tasks" ist immer enthalten (Kernmodul, nicht abwählbar).
 */
export function sanitizeEnabledModules(selected: string[]): string[] {
  const known = new Set(REAL_MODULE_KEYS);
  const cleaned = new Set(selected.filter((key) => known.has(key)));
  cleaned.add("tasks");
  return Array.from(cleaned);
}

export interface ProjectDataFlags {
  hasWiki: boolean;
  hasBudgets: boolean;
  hasCycles: boolean;
  hasBaselines: boolean;
  hasHillChart: boolean;
  hasTriage: boolean;
  hasCheckIns: boolean;
}

/**
 * Die tatsächlich sichtbaren Module = ausgewählte Module ∪ Module, für die das
 * Projekt bereits echte Daten hat. Verhindert, dass Projekte, die vor dieser
 * Funktion angelegt wurden (und daher nur `enabledModules: ["tasks"]` haben),
 * plötzlich ihre existierenden Wiki-Seiten/Budgets/Cycles/Baselines/Hill-Chart-
 * Positionen/Triage-Tasks/Check-ins verstecken — selbstheilend, ohne
 * Backfill-Migration nötig.
 */
export function computeEffectiveModules(storedModules: string[], dataFlags: ProjectDataFlags): Set<string> {
  const effective = new Set(storedModules);
  if (dataFlags.hasWiki) effective.add("wiki");
  if (dataFlags.hasBudgets) effective.add("budgets");
  if (dataFlags.hasCycles) effective.add("cycles");
  if (dataFlags.hasBaselines) effective.add("baselines");
  if (dataFlags.hasHillChart) effective.add("hill_chart");
  if (dataFlags.hasTriage) effective.add("triage");
  if (dataFlags.hasCheckIns) effective.add("check_ins");
  effective.add("tasks");
  return effective;
}
