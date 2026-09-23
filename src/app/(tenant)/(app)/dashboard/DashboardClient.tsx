"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarOff,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  Gauge,
  GripVertical,
  MoreHorizontal,
  Plus,
  Rss,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/shadcn/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/shadcn/components/dropdown-menu";
import { Input } from "@/ui/shadcn/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/components/popover";
import { Progress } from "@/ui/shadcn/components/progress";
import { ragVariantForUsagePercent } from "@/ui/nextelite/ragVariant";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { NumericCell } from "@/ui/nextelite/NumericCell";
import { WIDGET_CATALOG, WIDGET_CATALOG_BY_TYPE } from "@/tenant/reporting/widgets";
import { t, widgetLabel, type Locale } from "@/tenant/i18n/dictionary";

interface WidgetInstance {
  id: string;
  widgetType: string;
  title: string | null;
  enabled: boolean;
  position: number;
  span: number;
  filterProjectId: string | null;
}

interface DashboardData {
  id: string;
  name: string;
  isDefault: boolean;
  widgets: WidgetInstance[];
}

interface ProjectOption {
  id: string;
  name: string;
}

interface TaskRef {
  id: string;
  title: string;
  projectId: string | null;
  projectName: string;
}

interface ProgressRow {
  projectId: string;
  projectName: string;
  done: number;
  total: number;
  percent: number;
}

interface BudgetRow {
  projectId: string;
  projectName: string;
  budgetHours: number | null;
  actualHours: number;
  budgetAmount: number | null;
  actualAmount: number | null;
}

interface OutOfOfficeRow {
  userLabel: string;
  startDate: string;
  endDate: string;
}

interface ActivityFeedRow {
  id: string;
  summary: string;
  actorLabel: string;
  projectId: string;
  projectName: string;
  createdAt: string;
}

interface TimeSpentRow {
  period: string;
  availableHours: number;
  workedHours: number;
  billableHours: number;
  missingHours: number;
}

interface ForecastFulfillmentRow {
  projectId: string;
  projectName: string;
  forecastHours: number;
  billableHours: number;
  ratioPercent: number;
}

function taskHref(task: TaskRef): string {
  return task.projectId ? `/projects/${task.projectId}/tasks/${task.id}` : "#";
}

const WIDGET_ICON: Record<string, LucideIcon> = {
  overdue_tasks: Clock,
  my_tasks: CheckCircle2,
  project_progress: BarChart3,
  my_utilization: Users,
  budget_status: DollarSign,
  out_of_office: CalendarOff,
  activity_feed: Rss,
  time_spent_monthly: Clock,
  time_spent_yearly: Clock,
  forecast_fulfillment: Gauge,
};

function byProject<T extends { projectId: string | null }>(rows: T[], projectId: string | null): T[] {
  if (!projectId) return rows;
  return rows.filter((row) => row.projectId === projectId);
}

function groupByProject<T extends { projectName: string }>(items: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.projectName;
    const list = groups.get(key);
    if (list) {
      list.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return Array.from(groups.entries());
}

function TaskListWidget({ tasks, emptyLabel }: { tasks: TaskRef[]; emptyLabel: string }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {groupByProject(tasks).map(([projectName, projectTasks]) => (
        <div key={projectName}>
          <div className="mb-1 text-xs font-semibold text-muted-foreground">{projectName}</div>
          <ul className="flex flex-col gap-1">
            {projectTasks.map((task) => (
              <li key={task.id}>
                <Link href={taskHref(task)} className="text-sm hover:text-primary hover:underline">
                  {task.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ProgressRowItem({ label, sub, percent }: { label: React.ReactNode; sub: string; percent: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 text-muted-foreground">{sub}</span>
      </div>
      <Progress value={Math.min(100, percent)} variant={ragVariantForUsagePercent(percent)} />
    </div>
  );
}

export function DashboardClient({
  locale,
  dashboards: initialDashboards,
  projects,
  overdueTasks,
  myTasks,
  progressByProject,
  myUtilization,
  budgetStatuses,
  outOfOffice,
  activityFeed,
  timeSpentMonthly,
  timeSpentYearly,
  forecastFulfillment,
}: {
  locale?: Locale | null;
  dashboards: DashboardData[];
  projects: ProjectOption[];
  overdueTasks: TaskRef[];
  myTasks: TaskRef[];
  progressByProject: ProgressRow[];
  myUtilization: { plannedHours: number; weeklyCapacityHours: number };
  budgetStatuses: BudgetRow[];
  outOfOffice: OutOfOfficeRow[];
  activityFeed: ActivityFeedRow[];
  timeSpentMonthly: TimeSpentRow[];
  timeSpentYearly: TimeSpentRow[];
  forecastFulfillment: ForecastFulfillmentRow[];
}) {
  const [dashboards, setDashboards] = useState(initialDashboards);
  const [selectedId, setSelectedId] = useState(
    () => initialDashboards.find((d) => d.isDefault)?.id ?? initialDashboards[0]?.id ?? "",
  );
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [newDashboardOpen, setNewDashboardOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [renamingDashboard, setRenamingDashboard] = useState(false);
  const [dashboardNameDraft, setDashboardNameDraft] = useState("");

  const selectedDashboard = dashboards.find((d) => d.id === selectedId) ?? dashboards[0];
  const widgets = useMemo(
    () => (selectedDashboard ? selectedDashboard.widgets.filter((w) => w.enabled).sort((a, b) => a.position - b.position) : []),
    [selectedDashboard],
  );

  function updateDashboardWidgets(dashboardId: string, updater: (widgets: WidgetInstance[]) => WidgetInstance[]) {
    setDashboards((prev) =>
      prev.map((dashboard) => (dashboard.id === dashboardId ? { ...dashboard, widgets: updater(dashboard.widgets) } : dashboard)),
    );
  }

  async function patchWidget(widgetId: string, changes: Partial<Pick<WidgetInstance, "span" | "title" | "filterProjectId" | "position" | "enabled">>) {
    await fetch(`/api/tenant/dashboard-widgets/${widgetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
  }

  function handleDrop(targetWidgetId: string) {
    if (!selectedDashboard || !draggedWidgetId || draggedWidgetId === targetWidgetId) {
      setDraggedWidgetId(null);
      return;
    }
    const ordered = widgets.slice();
    const from = ordered.findIndex((w) => w.id === draggedWidgetId);
    const to = ordered.findIndex((w) => w.id === targetWidgetId);
    if (from === -1 || to === -1) {
      setDraggedWidgetId(null);
      return;
    }
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    const reindexed = ordered.map((w, index) => ({ ...w, position: index }));

    updateDashboardWidgets(selectedDashboard.id, (all) => {
      const byId = new Map(reindexed.map((w) => [w.id, w]));
      return all.map((w) => byId.get(w.id) ?? w);
    });
    setDraggedWidgetId(null);
    Promise.all(reindexed.map((w) => patchWidget(w.id, { position: w.position }))).catch(() => undefined);
  }

  async function removeWidget(widget: WidgetInstance) {
    if (!selectedDashboard) return;
    updateDashboardWidgets(selectedDashboard.id, (all) => all.filter((w) => w.id !== widget.id));
    await fetch(`/api/tenant/dashboard-widgets/${widget.id}`, { method: "DELETE" });
  }

  async function toggleSpan(widget: WidgetInstance) {
    if (!selectedDashboard) return;
    const nextSpan = widget.span === 2 ? 1 : 2;
    updateDashboardWidgets(selectedDashboard.id, (all) => all.map((w) => (w.id === widget.id ? { ...w, span: nextSpan } : w)));
    await patchWidget(widget.id, { span: nextSpan });
  }

  async function setFilterProject(widget: WidgetInstance, projectId: string | null) {
    if (!selectedDashboard) return;
    updateDashboardWidgets(selectedDashboard.id, (all) =>
      all.map((w) => (w.id === widget.id ? { ...w, filterProjectId: projectId } : w)),
    );
    await patchWidget(widget.id, { filterProjectId: projectId });
  }

  function startEditingTitle(widget: WidgetInstance) {
    setEditingTitleId(widget.id);
    setTitleDraft(widget.title ?? widgetLabel(locale, widget.widgetType));
  }

  async function commitTitle(widget: WidgetInstance) {
    if (!selectedDashboard) return;
    const trimmed = titleDraft.trim();
    const defaultLabel = widgetLabel(locale, widget.widgetType);
    const nextTitle = trimmed && trimmed !== defaultLabel ? trimmed : null;
    updateDashboardWidgets(selectedDashboard.id, (all) => all.map((w) => (w.id === widget.id ? { ...w, title: nextTitle } : w)));
    setEditingTitleId(null);
    await patchWidget(widget.id, { title: nextTitle });
  }

  async function addWidget(widgetType: string) {
    if (!selectedDashboard) return;
    const response = await fetch(`/api/tenant/dashboards/${selectedDashboard.id}/widgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetType }),
    });
    if (!response.ok) return;
    const { widget } = await response.json();
    updateDashboardWidgets(selectedDashboard.id, (all) => [...all, widget]);
  }

  async function createDashboard() {
    const name = newDashboardName.trim();
    if (!name) return;
    const response = await fetch("/api/tenant/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startEmpty: true }),
    });
    if (!response.ok) return;
    const { dashboard } = await response.json();
    setDashboards((prev) => [...prev, { ...dashboard, widgets: [] }]);
    setSelectedId(dashboard.id);
    setNewDashboardName("");
    setNewDashboardOpen(false);
  }

  async function renameDashboard() {
    if (!selectedDashboard) return;
    const name = dashboardNameDraft.trim();
    if (!name) return;
    setDashboards((prev) => prev.map((d) => (d.id === selectedDashboard.id ? { ...d, name } : d)));
    setRenamingDashboard(false);
    await fetch(`/api/tenant/dashboards/${selectedDashboard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function deleteDashboard() {
    if (!selectedDashboard || dashboards.length <= 1) return;
    const confirmMessage =
      locale === "en" ? `Really delete "${selectedDashboard.name}"?` : `„${selectedDashboard.name}“ wirklich löschen?`;
    if (!window.confirm(confirmMessage)) return;
    const remaining = dashboards.filter((d) => d.id !== selectedDashboard.id);
    setDashboards(remaining);
    setSelectedId(remaining[0]?.id ?? "");
    await fetch(`/api/tenant/dashboards/${selectedDashboard.id}`, { method: "DELETE" });
  }

  function renderWidgetBody(widget: WidgetInstance) {
    const projectId = widget.filterProjectId;
    switch (widget.widgetType) {
      case "overdue_tasks":
        return <TaskListWidget tasks={byProject(overdueTasks, projectId)} emptyLabel={t(locale, "widget.noOverdueTasks")} />;
      case "my_tasks":
        return <TaskListWidget tasks={byProject(myTasks, projectId)} emptyLabel={t(locale, "widget.noOpenTasks")} />;
      case "project_progress": {
        const rows = byProject(progressByProject, projectId);
        return rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(locale, "widget.noProjectsYet")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <ProgressRowItem
                key={row.projectId}
                label={
                  <Link href={`/projects/${row.projectId}/list`} className="hover:text-primary hover:underline">
                    {row.projectName}
                  </Link>
                }
                sub={`${row.percent}% · ${row.done}/${row.total}`}
                percent={row.percent}
              />
            ))}
          </div>
        );
      }
      case "my_utilization": {
        const percent =
          myUtilization.weeklyCapacityHours > 0
            ? Math.round((myUtilization.plannedHours / myUtilization.weeklyCapacityHours) * 100)
            : 0;
        return (
          <ProgressRowItem
            label={t(locale, "widget.thisWeek")}
            sub={`${myUtilization.plannedHours}h / ${myUtilization.weeklyCapacityHours}h`}
            percent={percent}
          />
        );
      }
      case "budget_status": {
        const rows = byProject(budgetStatuses, projectId);
        return rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(locale, "widget.noBudgetProjects")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === "en" ? "Budget / project" : "Budget / Projekt"}</TableHead>
                  <TableHead className="text-right">{locale === "en" ? "Total budget" : "Budget gesamt"}</TableHead>
                  <TableHead className="text-right">{locale === "en" ? "Used" : "Verbraucht"}</TableHead>
                  <TableHead className="text-right">{locale === "en" ? "Remaining" : "Verbleibend"}</TableHead>
                  <TableHead className="w-32">{locale === "en" ? "Usage" : "Nutzung"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const total = row.budgetAmount ?? row.budgetHours;
                  const used = row.budgetAmount !== null ? row.actualAmount : row.actualHours;
                  const unit = row.budgetAmount !== null ? "" : "h";
                  const percent = total && total > 0 && used !== null ? Math.round((used / total) * 100) : null;
                  const remaining = total !== null && used !== null ? total - used : null;
                  return (
                    <TableRow key={row.projectId}>
                      <TableCell>
                        <Link href={`/projects/${row.projectId}/budget`} className="hover:text-primary hover:underline">
                          {row.projectName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {total !== null ? `${total.toFixed(unit ? 1 : 2)}${unit}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {used !== null ? `${used.toFixed(unit ? 1 : 2)}${unit}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {remaining !== null ? `${remaining.toFixed(unit ? 1 : 2)}${unit}` : "—"}
                      </TableCell>
                      <TableCell>{percent !== null && <Progress value={Math.min(100, percent)} variant={ragVariantForUsagePercent(percent)} />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        );
      }
      case "out_of_office":
        return outOfOffice.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(locale, "widget.noOneAway")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {outOfOffice.map((row, index) => (
              <li key={index} className="flex items-center justify-between text-sm">
                <span>{row.userLabel}</span>
                <span className="text-muted-foreground">
                  {new Date(row.startDate).toLocaleDateString(locale === "en" ? "en-US" : "de-DE")} –{" "}
                  {new Date(row.endDate).toLocaleDateString(locale === "en" ? "en-US" : "de-DE")}
                </span>
              </li>
            ))}
          </ul>
        );
      case "activity_feed": {
        const rows = byProject(activityFeed, projectId);
        return rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(locale, "widget.noActivityYet")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((event) => (
              <li key={event.id} className="text-sm">
                <span className="font-medium">{event.actorLabel}</span> {event.summary}
                <div className="text-xs text-muted-foreground">
                  {event.projectName} ·{" "}
                  {new Date(event.createdAt).toLocaleString(locale === "en" ? "en-US" : "de-DE", { timeZone: "Europe/Berlin" })}
                </div>
              </li>
            ))}
          </ul>
        );
      }
      case "time_spent_monthly":
      case "time_spent_yearly": {
        const rows = widget.widgetType === "time_spent_monthly" ? timeSpentMonthly : timeSpentYearly;
        return rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(locale, "widget.noTimeEntries")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {widget.widgetType === "time_spent_monthly"
                      ? locale === "en"
                        ? "Week"
                        : "Woche"
                      : locale === "en"
                        ? "Month"
                        : "Monat"}
                  </TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Worked</TableHead>
                  <TableHead className="text-right">Billable</TableHead>
                  <TableHead className="text-right">Missing hrs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell>{row.period}</TableCell>
                    <NumericCell value={row.availableHours} format="hours" className="text-muted-foreground" />
                    <NumericCell value={row.workedHours} format="hours" className="text-muted-foreground" />
                    <NumericCell value={row.billableHours} format="hours" className="text-muted-foreground" />
                    <NumericCell value={row.missingHours} format="hours" className="text-muted-foreground" />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      }
      case "forecast_fulfillment": {
        const rows = byProject(forecastFulfillment, projectId);
        return rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(locale, "widget.noBookingsThisWeek")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === "en" ? "Project" : "Projekt"}</TableHead>
                  <TableHead className="text-right">Forecast</TableHead>
                  <TableHead className="text-right">Billable</TableHead>
                  <TableHead className="text-right">Ratio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.projectId}>
                    <TableCell>
                      <Link href={`/projects/${row.projectId}/list`} className="hover:text-primary hover:underline">
                        {row.projectName}
                      </Link>
                    </TableCell>
                    <NumericCell value={row.forecastHours} format="hours" className="text-muted-foreground" />
                    <NumericCell value={row.billableHours} format="hours" className="text-muted-foreground" />
                    <NumericCell value={row.ratioPercent} format="percent" className="text-muted-foreground" />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      }
      default:
        return null;
    }
  }

  if (!selectedDashboard) {
    return null;
  }

  return (
    <div className="py-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {renamingDashboard ? (
            <Input
              autoFocus
              value={dashboardNameDraft}
              onChange={(event) => setDashboardNameDraft(event.target.value)}
              onBlur={renameDashboard}
              onKeyDown={(event) => {
                if (event.key === "Enter") renameDashboard();
                if (event.key === "Escape") setRenamingDashboard(false);
              }}
              className="h-9 w-56 font-display text-2xl font-bold tracking-tight"
            />
          ) : (
            <h1
              className="cursor-text text-2xl font-bold tracking-tight"
              onClick={() => {
                setDashboardNameDraft(selectedDashboard.name);
                setRenamingDashboard(true);
              }}
              title={t(locale, "dashboard.rename")}
            >
              {selectedDashboard.name}
            </h1>
          )}

          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-9 w-48" aria-label={locale === "en" ? "Choose dashboard" : "Dashboard wählen"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dashboards.map((dashboard) => (
                <SelectItem key={dashboard.id} value={dashboard.id}>
                  {dashboard.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={newDashboardOpen} onOpenChange={setNewDashboardOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t(locale, "dashboard.newDashboard")} title={t(locale, "dashboard.newDashboard")}>
                <Plus className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <p className="mb-2 text-sm font-medium">{t(locale, "dashboard.newDashboard")}</p>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder={t(locale, "dashboard.name")}
                  value={newDashboardName}
                  onChange={(event) => setNewDashboardName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") createDashboard();
                  }}
                />
                <Button size="sm" onClick={createDashboard}>
                  {t(locale, "dashboard.create")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {dashboards.length > 1 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={deleteDashboard}
              aria-label={locale === "en" ? "Delete dashboard" : "Dashboard löschen"}
              title={locale === "en" ? "Delete dashboard" : "Dashboard löschen"}
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="size-4" />
              {t(locale, "dashboard.addWidget")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {WIDGET_CATALOG.map((entry) => (
              <DropdownMenuItem key={entry.type} onSelect={() => addWidget(entry.type)}>
                {widgetLabel(locale, entry.type)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {widgets.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">{t(locale, "dashboard.noWidgetsTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t(locale, "dashboard.noWidgetsDesc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {widgets.map((widget) => {
            const catalogEntry = WIDGET_CATALOG_BY_TYPE.get(widget.widgetType as never);
            const Icon = WIDGET_ICON[widget.widgetType];
            const label = widget.title ?? widgetLabel(locale, widget.widgetType);
            const isDragging = draggedWidgetId === widget.id;
            return (
              <Card
                key={widget.id}
                className={`${widget.span === 2 ? "md:col-span-2" : "md:col-span-1"} ${isDragging ? "opacity-50" : ""}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(widget.id);
                }}
              >
                <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                  <span
                    draggable
                    onDragStart={() => setDraggedWidgetId(widget.id)}
                    onDragEnd={() => setDraggedWidgetId(null)}
                    className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
                    aria-label={locale === "en" ? "Move" : "Verschieben"}
                  >
                    <GripVertical className="size-4" />
                  </span>
                  {Icon && <Icon className="size-4 text-muted-foreground" />}
                  {editingTitleId === widget.id ? (
                    <Input
                      autoFocus
                      value={titleDraft}
                      onChange={(event) => setTitleDraft(event.target.value)}
                      onBlur={() => commitTitle(widget)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitTitle(widget);
                        if (event.key === "Escape") setEditingTitleId(null);
                      }}
                      className="h-7 flex-1 text-sm"
                    />
                  ) : (
                    <CardTitle
                      className="flex-1 cursor-text truncate text-sm"
                      onClick={() => startEditingTitle(widget)}
                      title={t(locale, "dashboard.rename")}
                    >
                      {label}
                    </CardTitle>
                  )}

                  {catalogEntry?.filterable && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t(locale, "dashboard.filterByProject")}
                          title={t(locale, "dashboard.filterByProject")}
                          className={widget.filterProjectId ? "text-primary" : "text-muted-foreground"}
                        >
                          <Filter className="size-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-64">
                        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">{t(locale, "dashboard.filterByProject")}</p>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => setFilterProject(widget, null)}
                            className={`rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${!widget.filterProjectId ? "bg-primary/10 text-primary" : ""}`}
                          >
                            {t(locale, "dashboard.allProjects")}
                          </button>
                          {projects.map((project) => (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => setFilterProject(widget, project.id)}
                              className={`rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${widget.filterProjectId === project.id ? "bg-primary/10 text-primary" : ""}`}
                            >
                              {project.name}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={locale === "en" ? "Widget options" : "Widget-Optionen"}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => startEditingTitle(widget)}>{t(locale, "dashboard.rename")}</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toggleSpan(widget)}>
                        {widget.span === 2 ? t(locale, "dashboard.narrow") : t(locale, "dashboard.widen")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => removeWidget(widget)}>
                        <X className="size-4" /> {t(locale, "dashboard.remove")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>{renderWidgetBody(widget)}</CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
