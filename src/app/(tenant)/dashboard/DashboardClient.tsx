"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface ResolvedWidget {
  type: string;
  label: string;
  enabled: boolean;
  position: number;
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

function taskHref(task: TaskRef): string {
  return task.projectId ? `/projects/${task.projectId}/tasks/${task.id}` : "#";
}

export function DashboardClient({
  widgets,
  overdueTasks,
  myTasks,
  progressByProject,
  myUtilization,
  budgetStatuses,
}: {
  widgets: ResolvedWidget[];
  overdueTasks: TaskRef[];
  myTasks: TaskRef[];
  progressByProject: ProgressRow[];
  myUtilization: { plannedHours: number; weeklyCapacityHours: number };
  budgetStatuses: BudgetRow[];
}) {
  const router = useRouter();
  const enabledWidgets = widgets.filter((w) => w.enabled).sort((a, b) => a.position - b.position);

  async function updatePreference(widgetType: string, changes: { enabled?: boolean; position?: number }) {
    await fetch("/api/tenant/dashboard/widgets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetType, ...changes }),
    });
    router.refresh();
  }

  async function toggleWidget(widget: ResolvedWidget) {
    await updatePreference(widget.type, { enabled: !widget.enabled, position: widget.position });
  }

  async function moveWidget(widget: ResolvedWidget, direction: -1 | 1) {
    const sorted = widgets.slice().sort((a, b) => a.position - b.position);
    const index = sorted.findIndex((w) => w.type === widget.type);
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const other = sorted[swapIndex];

    await Promise.all([
      fetch("/api/tenant/dashboard/widgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetType: widget.type, position: other.position }),
      }),
      fetch("/api/tenant/dashboard/widgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetType: other.type, position: widget.position }),
      }),
    ]);
    router.refresh();
  }

  function renderWidgetBody(type: string) {
    switch (type) {
      case "overdue_tasks":
        return overdueTasks.length === 0 ? (
          <p className="text-muted">Keine überfälligen Tasks.</p>
        ) : (
          <ul className="list-plain">
            {overdueTasks.map((t) => (
              <li key={t.id}>
                <Link href={taskHref(t)}>{t.title}</Link>
                <span className="text-muted">{t.projectName}</span>
              </li>
            ))}
          </ul>
        );
      case "my_tasks":
        return myTasks.length === 0 ? (
          <p className="text-muted">Keine offenen Tasks.</p>
        ) : (
          <ul className="list-plain">
            {myTasks.map((t) => (
              <li key={t.id}>
                <Link href={taskHref(t)}>{t.title}</Link>
                <span className="text-muted">{t.projectName}</span>
              </li>
            ))}
          </ul>
        );
      case "project_progress":
        return progressByProject.length === 0 ? (
          <p className="text-muted">Noch keine Projekte.</p>
        ) : (
          <>
            {progressByProject.map((row) => (
              <div className="scale-row" key={row.projectId}>
                <div className="scale-row-labels">
                  <Link href={`/projects/${row.projectId}/list`}>{row.projectName}</Link>
                  <span className="text-muted">
                    {row.percent}% · {row.done}/{row.total}
                  </span>
                </div>
                <div className="scale-bar">
                  <div className="scale-bar-fill" style={{ width: `${row.percent}%` }} />
                </div>
              </div>
            ))}
          </>
        );
      case "my_utilization": {
        const percent =
          myUtilization.weeklyCapacityHours > 0
            ? Math.round((myUtilization.plannedHours / myUtilization.weeklyCapacityHours) * 100)
            : 0;
        return (
          <div className="scale-row">
            <div className="scale-row-labels">
              <span>Diese Woche</span>
              <span className="text-muted">
                {myUtilization.plannedHours}h / {myUtilization.weeklyCapacityHours}h
              </span>
            </div>
            <div className="scale-bar">
              <div
                className={`scale-bar-fill${percent > 100 ? " is-over" : ""}`}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
          </div>
        );
      }
      case "budget_status":
        return budgetStatuses.length === 0 ? (
          <p className="text-muted">Keine Projekte mit Budget.</p>
        ) : (
          <>
            {budgetStatuses.map((row) => {
              const percent =
                row.budgetHours && row.budgetHours > 0
                  ? Math.round((row.actualHours / row.budgetHours) * 100)
                  : null;
              return (
                <div className="scale-row" key={row.projectId}>
                  <div className="scale-row-labels">
                    <Link href={`/projects/${row.projectId}/budget`}>{row.projectName}</Link>
                    <span className="text-muted">
                      {row.actualHours.toFixed(1)}h{row.budgetHours !== null ? ` / ${row.budgetHours}h` : ""}
                    </span>
                  </div>
                  {percent !== null && (
                    <div className="scale-bar">
                      <div
                        className={`scale-bar-fill${percent > 100 ? " is-over" : ""}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        );
      default:
        return null;
    }
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-8)" }}>
        <h1 style={{ marginBottom: 0 }}>Dashboard</h1>
        <details style={{ marginBottom: 0 }}>
          <summary className="btn btn-secondary btn-sm" style={{ display: "inline-flex" }}>
            Widgets verwalten
          </summary>
          <div className="widget-card" style={{ marginTop: "var(--space-3)" }}>
            <ul className="stack" style={{ gap: "var(--space-2)" }}>
              {widgets
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((widget) => (
                  <li key={widget.type} className="row" style={{ gap: "var(--space-3)" }}>
                    <input type="checkbox" checked={widget.enabled} onChange={() => toggleWidget(widget)} />
                    <span style={{ flex: 1 }}>{widget.label}</span>
                    <button type="button" onClick={() => moveWidget(widget, -1)} className="btn btn-ghost btn-sm">
                      ↑
                    </button>
                    <button type="button" onClick={() => moveWidget(widget, 1)} className="btn btn-ghost btn-sm">
                      ↓
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </details>
      </div>

      <div className="widget-grid">
        {enabledWidgets.map((widget) => (
          <div key={widget.type} className="widget-card">
            <div className="widget-title">{widget.label}</div>
            {renderWidgetBody(widget.type)}
          </div>
        ))}
      </div>
    </div>
  );
}
