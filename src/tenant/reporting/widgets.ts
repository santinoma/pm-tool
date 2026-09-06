export type WidgetType =
  | "overdue_tasks"
  | "my_tasks"
  | "project_progress"
  | "my_utilization"
  | "budget_status"
  | "out_of_office"
  | "activity_feed"
  | "time_spent_monthly"
  | "time_spent_yearly"
  | "forecast_fulfillment";

export interface WidgetCatalogEntry {
  type: WidgetType;
  label: string;
  defaultSpan: 1 | 2;
  // Whether this widget's rows can be narrowed to a single project.
  filterable: boolean;
}

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  { type: "overdue_tasks", label: "Überfällige Tasks", defaultSpan: 1, filterable: true },
  { type: "my_tasks", label: "Meine Tasks", defaultSpan: 1, filterable: true },
  { type: "project_progress", label: "Projekt-Fortschritt", defaultSpan: 1, filterable: true },
  { type: "my_utilization", label: "Meine Auslastung diese Woche", defaultSpan: 1, filterable: false },
  { type: "budget_status", label: "Budget-Status", defaultSpan: 2, filterable: true },
  { type: "out_of_office", label: "Out of office this month", defaultSpan: 1, filterable: false },
  { type: "activity_feed", label: "Feed", defaultSpan: 1, filterable: true },
  { type: "time_spent_monthly", label: "My monthly time spent", defaultSpan: 2, filterable: false },
  { type: "time_spent_yearly", label: "My yearly time spent", defaultSpan: 2, filterable: false },
  { type: "forecast_fulfillment", label: "Fulfillment of forecast", defaultSpan: 2, filterable: true },
];

export const WIDGET_CATALOG_BY_TYPE = new Map(WIDGET_CATALOG.map((entry) => [entry.type, entry]));

export interface DashboardWidgetInstance {
  id: string;
  widgetType: string;
  title: string | null;
  enabled: boolean;
  position: number;
  span: number;
  filterProjectId: string | null;
}
