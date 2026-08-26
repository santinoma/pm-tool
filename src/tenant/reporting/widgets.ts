export type WidgetType =
  | "overdue_tasks"
  | "my_tasks"
  | "project_progress"
  | "my_utilization"
  | "budget_status";

export interface WidgetCatalogEntry {
  type: WidgetType;
  label: string;
  defaultPosition: number;
}

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  { type: "overdue_tasks", label: "Überfällige Tasks", defaultPosition: 0 },
  { type: "my_tasks", label: "Meine Tasks", defaultPosition: 1 },
  { type: "project_progress", label: "Projekt-Fortschritt", defaultPosition: 2 },
  { type: "my_utilization", label: "Meine Auslastung diese Woche", defaultPosition: 3 },
  { type: "budget_status", label: "Budget-Status", defaultPosition: 4 },
];

export interface SavedWidgetPreference {
  widgetType: string;
  enabled: boolean;
  position: number;
}

export interface ResolvedWidget {
  type: WidgetType;
  label: string;
  enabled: boolean;
  position: number;
}

export function mergeWidgetPreferences(
  catalog: WidgetCatalogEntry[],
  savedPreferences: SavedWidgetPreference[],
): ResolvedWidget[] {
  const savedByType = new Map(savedPreferences.map((pref) => [pref.widgetType, pref]));

  return catalog
    .map((entry) => {
      const saved = savedByType.get(entry.type);
      return {
        type: entry.type,
        label: entry.label,
        enabled: saved?.enabled ?? true,
        position: saved?.position ?? entry.defaultPosition,
      };
    })
    .sort((a, b) => a.position - b.position);
}
