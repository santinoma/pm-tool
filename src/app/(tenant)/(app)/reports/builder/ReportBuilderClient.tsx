"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  REPORT_DATA_SOURCES,
  REPORT_FIELDS,
  type ReportDataSource,
  type ReportFilterConfig,
  type ReportFilterOperator,
} from "@/tenant/reporting/reportQuery";

import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

type ChartType = "none" | "bar" | "line" | "pie";

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  none: "Kein Diagramm",
  bar: "Balkendiagramm",
  line: "Liniendiagramm",
  pie: "Kreisdiagramm",
};

// Reference §05: "Konsistente Farb-/Legenden-Sprache über alle Widgets
// (dieselbe Palette wie Inline-Donuts der Listen)" — reuses the design
// system's Accent/RAG/Info tokens (see --chart-1..5 in tokens.css) instead
// of an unrelated hardcoded rainbow palette.
const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const DATA_SOURCE_LABELS: Record<ReportDataSource, string> = {
  tasks: "Tasks",
  time_entries: "Zeiteinträge",
  budgets: "Budgets",
};

const OPERATOR_LABELS: Record<ReportFilterOperator, string> = {
  eq: "ist gleich",
  neq: "ist nicht gleich",
  contains: "enthält",
  gt: "größer als",
  lt: "kleiner als",
};

interface ReportTemplate {
  key: string;
  title: string;
  description: string;
  category: "Tasks" | "Zeit" | "Budgets";
  dataSource: ReportDataSource;
  filters?: (today: string) => ReportFilterConfig[];
  groupByField: string;
  chartType: ChartType;
}

// Vorlagen, die auf unsere drei unterstützten Datenquellen (tasks/time_entries/budgets)
// abgebildet werden können — der Teil von Productives 59 Report-Vorlagen, der ohne
// Erweiterung der Datenquellen direkt umsetzbar ist (Roadmap #02).
const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    key: "open-tasks-by-assignee",
    title: "Offene Tasks nach Assignee",
    description: "Alle nicht erledigten Tasks, gruppiert nach Assignee.",
    category: "Tasks",
    dataSource: "tasks",
    filters: () => [{ field: "statusCategory", operator: "neq", value: "done" }],
    groupByField: "assignee",
    chartType: "bar",
  },
  {
    key: "tasks-by-status",
    title: "Tasks nach Status",
    description: "Verteilung aller Tasks über die Workflow-Status.",
    category: "Tasks",
    dataSource: "tasks",
    groupByField: "status",
    chartType: "pie",
  },
  {
    key: "overdue-tasks-by-project",
    title: "Überfällige Tasks nach Projekt",
    description: "Tasks mit Fälligkeit in der Vergangenheit, gruppiert nach Projekt.",
    category: "Tasks",
    dataSource: "tasks",
    filters: (today) => [{ field: "dueDate", operator: "lt", value: today }],
    groupByField: "project",
    chartType: "bar",
  },
  {
    key: "tasks-by-project",
    title: "Tasks nach Projekt",
    description: "Alle Tasks projektübergreifend gruppiert.",
    category: "Tasks",
    dataSource: "tasks",
    groupByField: "project",
    chartType: "bar",
  },
  {
    key: "done-tasks-by-assignee",
    title: "Erledigte Tasks nach Assignee",
    description: "Abgeschlossene Tasks, gruppiert nach Assignee — für Auslastungs-/Leistungsrückblicke.",
    category: "Tasks",
    dataSource: "tasks",
    filters: () => [{ field: "statusCategory", operator: "eq", value: "done" }],
    groupByField: "assignee",
    chartType: "bar",
  },
  {
    key: "unestimated-tasks-by-project",
    title: "Tasks ohne Schätzung",
    description: "Tasks ohne geschätzte Stunden, gruppiert nach Projekt — zum Nachschätzen vor Sprintplanung.",
    category: "Tasks",
    dataSource: "tasks",
    filters: () => [{ field: "estimatedHours", operator: "eq", value: "" }],
    groupByField: "project",
    chartType: "bar",
  },
  {
    key: "time-by-user",
    title: "Zeit nach Nutzer",
    description: "Erfasste Zeit, gruppiert nach Nutzer.",
    category: "Zeit",
    dataSource: "time_entries",
    groupByField: "user",
    chartType: "bar",
  },
  {
    key: "time-by-project",
    title: "Zeit nach Projekt",
    description: "Erfasste Zeit, gruppiert nach Projekt.",
    category: "Zeit",
    dataSource: "time_entries",
    groupByField: "project",
    chartType: "pie",
  },
  {
    key: "time-by-task",
    title: "Zeit nach Task",
    description: "Erfasste Zeit, gruppiert nach Task — zum Auffinden zeitintensiver Tasks.",
    category: "Zeit",
    dataSource: "time_entries",
    groupByField: "task",
    chartType: "bar",
  },
  {
    key: "budget-usage-by-project",
    title: "Budget-Auslastung nach Projekt",
    description: "Verbrauchtes vs. verbleibendes Budget je Projekt.",
    category: "Budgets",
    dataSource: "budgets",
    groupByField: "project",
    chartType: "bar",
  },
  {
    key: "budgets-over-90-percent",
    title: "Budgets über 90% Auslastung",
    description: "Budgets, die kurz vor oder über der Kappungsgrenze liegen.",
    category: "Budgets",
    dataSource: "budgets",
    filters: () => [{ field: "usagePercent", operator: "gt", value: 90 }],
    groupByField: "project",
    chartType: "bar",
  },
  {
    key: "all-budgets",
    title: "Alle Budgets",
    description: "Vollständige Budget-Liste projektübergreifend.",
    category: "Budgets",
    dataSource: "budgets",
    groupByField: "title",
    chartType: "none",
  },
];

interface SavedReportRecord {
  id: string;
  name: string;
  category: string | null;
  dataSource: string;
  filterConfig: { field: string; operator: string; value: unknown }[];
  groupByConfig: { field: string } | null;
  projectId: string | null;
  chartType: string | null;
}

interface ReportGroupResult {
  key: string;
  rows: Record<string, unknown>[];
}

export function ReportBuilderClient({
  canRunOrgWide,
  projects,
  initialSavedReports,
}: {
  canRunOrgWide: boolean;
  projects: { id: string; name: string }[];
  initialSavedReports: SavedReportRecord[];
}) {
  const [dataSource, setDataSource] = useState<ReportDataSource>("tasks");
  const [projectId, setProjectId] = useState<string>(canRunOrgWide ? "__all__" : (projects[0]?.id ?? "__all__"));
  const [filters, setFilters] = useState<ReportFilterConfig[]>([]);
  const [groupByField, setGroupByField] = useState<string>("__none__");
  const [chartType, setChartType] = useState<ChartType>("none");
  const [groups, setGroups] = useState<ReportGroupResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReportRecord[]>(initialSavedReports);
  const [saveName, setSaveName] = useState("");
  const [saveCategory, setSaveCategory] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchParams = useSearchParams();

  const fields = useMemo(() => REPORT_FIELDS[dataSource], [dataSource]);

  useEffect(() => {
    const reportId = searchParams.get("reportId");
    if (!reportId) return;
    const report = initialSavedReports.find((r) => r.id === reportId);
    if (report) loadSavedReport(report);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams({ source: "report", dataSource });
    if (filters.length > 0) params.set("filters", JSON.stringify(filters));
    if (groupByField !== "__none__") params.set("groupBy", JSON.stringify({ field: groupByField }));
    if (projectId !== "__all__") params.set("projectId", projectId);
    return `/api/tenant/exports/csv?${params.toString()}`;
  }, [dataSource, filters, groupByField, projectId]);

  function addFilterRow() {
    setFilters((current) => [...current, { field: fields[0].field, operator: "eq", value: "" }]);
  }

  function updateFilterRow(index: number, patch: Partial<ReportFilterConfig>) {
    setFilters((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeFilterRow(index: number) {
    setFilters((current) => current.filter((_, i) => i !== index));
  }

  function changeDataSource(next: ReportDataSource) {
    setDataSource(next);
    setFilters([]);
    setGroupByField("__none__");
    setGroups(null);
  }

  async function runReport() {
    setRunning(true);
    setRunError(null);
    const response = await fetch("/api/tenant/reports/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataSource,
        filters,
        groupBy: groupByField !== "__none__" ? { field: groupByField } : undefined,
        projectId: projectId !== "__all__" ? projectId : undefined,
      }),
    });
    setRunning(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setRunError(data.error ?? "Bericht konnte nicht ausgeführt werden.");
      setGroups(null);
      return;
    }
    const data = await response.json();
    setGroups(data.groups ?? []);
  }

  async function saveReport() {
    if (!saveName.trim()) return;
    setSaving(true);
    const response = await fetch("/api/tenant/saved-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: saveName.trim(),
        category: saveCategory.trim() || undefined,
        dataSource,
        filterConfig: filters,
        groupByConfig: groupByField !== "__none__" ? { field: groupByField } : undefined,
        projectId: projectId !== "__all__" ? projectId : undefined,
        chartType: chartType !== "none" ? chartType : undefined,
      }),
    });
    setSaving(false);
    if (response.ok) {
      const data = await response.json();
      setSavedReports((current) => [data.report, ...current]);
      setSaveName("");
      setSaveCategory("");
      setShowSaveForm(false);
    }
  }

  async function deleteSavedReport(id: string) {
    const response = await fetch(`/api/tenant/saved-reports/${id}`, { method: "DELETE" });
    if (response.ok) {
      setSavedReports((current) => current.filter((r) => r.id !== id));
    }
  }

  function loadSavedReport(report: SavedReportRecord) {
    setDataSource(report.dataSource as ReportDataSource);
    setFilters(report.filterConfig as ReportFilterConfig[]);
    setGroupByField(report.groupByConfig?.field ?? "__none__");
    setProjectId(report.projectId ?? "__all__");
    setChartType((report.chartType as ChartType) ?? "none");
    setGroups(null);
  }

  function applyTemplate(template: ReportTemplate) {
    setDataSource(template.dataSource);
    const today = new Date().toISOString().slice(0, 10);
    setFilters(template.filters ? template.filters(today) : []);
    setGroupByField(template.groupByField);
    setChartType(template.chartType);
    setGroups(null);
  }

  const chartData = useMemo(
    () => (groups ? groups.map((group) => ({ name: group.key, count: group.rows.length })) : []),
    [groups],
  );

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Berichte erstellen</h1>
      <p className="mb-6 text-sm text-muted-foreground">Datenquelle wählen, filtern, gruppieren — und als eigenen Bericht speichern.</p>

      <h2 className="mb-3 text-lg font-semibold">Vorlagen</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Vorlage wählen, um Datenquelle, Filter, Gruppierung und Diagramm vorauszufüllen — danach mit „Bericht ausführen&rdquo;
        starten oder anpassen.
      </p>
      <div className="mb-8 flex flex-col gap-5">
        {(["Tasks", "Zeit", "Budgets"] as const).map((category) => (
          <div key={category}>
            <div className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{category}</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {REPORT_TEMPLATES.filter((template) => template.category === category).map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="text-sm font-semibold">{template.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{template.description}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {savedReports.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {savedReports.map((report) => (
            <span key={report.id} className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => loadSavedReport(report)}>
                {report.name}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => deleteSavedReport(report.id)} aria-label={`Bericht "${report.name}" löschen`} title="Bericht löschen">
                <X className="size-3.5" />
              </Button>
            </span>
          ))}
        </div>
      )}

      <Card className="mb-6">
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex flex-col gap-2">
              <Label>Datenquelle</Label>
              <Select value={dataSource} onValueChange={(value) => changeDataSource(value as ReportDataSource)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_DATA_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {DATA_SOURCE_LABELS[source]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Projekt</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {canRunOrgWide && <SelectItem value="__all__">Alle Projekte (organisationsweit)</SelectItem>}
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Gruppieren nach</Label>
              <Select value={groupByField} onValueChange={setGroupByField}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keine Gruppierung</SelectItem>
                  {fields.map((field) => (
                    <SelectItem key={field.field} value={field.field}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {groupByField !== "__none__" && (
              <div className="flex flex-col gap-2">
                <Label>Diagramm</Label>
                <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CHART_TYPE_LABELS) as ChartType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {CHART_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="mb-4">
            <Label className="mb-2 block">Filter</Label>
            {filters.map((filter, index) => (
              <div key={index} className="mb-2 flex items-center gap-2">
                <Select value={filter.field} onValueChange={(value) => updateFilterRow(index, { field: value })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fields.map((field) => (
                      <SelectItem key={field.field} value={field.field}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filter.operator} onValueChange={(value) => updateFilterRow(index, { operator: value as ReportFilterOperator })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(OPERATOR_LABELS) as ReportFilterOperator[]).map((op) => (
                      <SelectItem key={op} value={op}>
                        {OPERATOR_LABELS[op]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Wert" value={String(filter.value ?? "")} onChange={(event) => updateFilterRow(index, { value: event.target.value })} className="flex-1" />
                <Button variant="ghost" size="icon-sm" onClick={() => removeFilterRow(index)} aria-label="Filter entfernen" title="Filter entfernen">
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addFilterRow}>
              + Filter hinzufügen
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runReport} loading={running}>
              {running ? "Läuft…" : "Bericht ausführen"}
            </Button>
            <Button variant="outline" onClick={() => setShowSaveForm((current) => !current)}>
              {showSaveForm ? "Abbrechen" : "Speichern"}
            </Button>
            <Button variant="outline" asChild>
              <a href={exportHref}>Exportieren (CSV)</a>
            </Button>
            {showSaveForm && (
              <span className="flex items-center gap-2">
                <Input placeholder="Name des Berichts" value={saveName} onChange={(event) => setSaveName(event.target.value)} />
                <Input placeholder="Kategorie (optional)" value={saveCategory} onChange={(event) => setSaveCategory(event.target.value)} className="w-44" />
                <Button size="sm" onClick={saveReport} disabled={saving || !saveName.trim()}>
                  Speichern
                </Button>
              </span>
            )}
          </div>
          {runError && <p className="mt-3 text-sm text-destructive">{runError}</p>}
        </CardContent>
      </Card>

      {groups &&
        (groups.length === 0 || groups.every((group) => group.rows.length === 0) ? (
          <div className="rounded-lg border py-14 text-center">
            <h3 className="font-semibold">Keine Ergebnisse</h3>
            <p className="mt-1 text-sm text-muted-foreground">Für diese Filterkombination gibt es keine Zeilen.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {chartType !== "none" && groupByField !== "__none__" && (
              <Card>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "bar" ? (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : chartType === "line" ? (
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} />
                        </LineChart>
                      ) : (
                        <PieChart>
                          <Tooltip />
                          <Pie data={chartData} dataKey="count" nameKey="name" outerRadius={100} label>
                            {chartData.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
            {groups.map((group) => (
              <div key={group.key}>
                <div className="mb-2 rounded-md bg-muted/40 px-4 py-2 text-sm font-semibold">
                  {group.key} <span className="font-normal text-muted-foreground">({group.rows.length})</span>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {fields.map((field) => (
                          <TableHead key={field.field}>{field.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {fields.map((field) => (
                            <TableCell key={field.field}>{formatCellValue(row[field.field])}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number") return String(Math.round(value * 100) / 100);
  return String(value);
}
