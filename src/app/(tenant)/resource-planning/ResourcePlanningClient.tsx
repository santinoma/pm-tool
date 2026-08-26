"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

interface Task {
  id: string;
  title: string;
  estimatedHours: number | null;
  projectName: string;
}

interface Person {
  id: string;
  email: string;
  name: string | null;
  weeklyCapacityHours: number;
  plannedHours: number;
  utilizationPercent: number;
  tasks: Task[];
}

export function ResourcePlanningClient({
  canEdit,
  weekStart,
  weekEnd,
  people,
}: {
  canEdit: boolean;
  weekStart: string;
  weekEnd: string;
  people: Person[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [capacityInput, setCapacityInput] = useState("");

  async function handleSaveCapacity(userId: string) {
    const parsed = Number(capacityInput);
    if (Number.isNaN(parsed)) return;
    await fetch(`/api/tenant/users/${userId}/capacity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyCapacityHours: parsed }),
    });
    setEditingId(null);
    router.refresh();
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

  return (
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-1)" }}>Ressourcenplanung</h1>
      <p className="text-muted coord" style={{ marginBottom: "var(--space-6)" }}>
        Woche {formatDate(weekStart)} – {formatDate(weekEnd)}
      </p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th style={{ textAlign: "right" }}>Geplant</th>
              <th style={{ textAlign: "right" }}>Kapazität</th>
              <th style={{ textAlign: "right" }}>Auslastung</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <Fragment key={person.id}>
                <tr>
                  <td>{person.name ?? person.email}</td>
                  <td className="coord" style={{ textAlign: "right" }}>
                    {person.plannedHours}h
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {editingId === person.id ? (
                      <span className="row" style={{ justifyContent: "flex-end", gap: "var(--space-2)" }}>
                        <input
                          type="number"
                          value={capacityInput}
                          onChange={(event) => setCapacityInput(event.target.value)}
                          className="input"
                          style={{ width: "5rem", height: "30px" }}
                        />
                        <button type="button" onClick={() => handleSaveCapacity(person.id)} className="btn btn-primary btn-sm">
                          Speichern
                        </button>
                      </span>
                    ) : (
                      <span className="row" style={{ justifyContent: "flex-end", gap: "var(--space-2)" }}>
                        <span className="coord">{person.weeklyCapacityHours}h</span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(person.id);
                              setCapacityInput(person.weeklyCapacityHours.toString());
                            }}
                            className="btn btn-ghost btn-sm"
                          >
                            Bearbeiten
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="coord" style={{ textAlign: "right" }}>
                    {person.utilizationPercent.toFixed(0)}%
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === person.id ? null : person.id)}
                      className="btn btn-ghost btn-sm"
                    >
                      {expanded === person.id ? "Weniger" : `${person.tasks.length} Tasks`}
                    </button>
                  </td>
                </tr>
                {expanded === person.id && (
                  <tr>
                    <td colSpan={5} style={{ background: "var(--surface-2)" }}>
                      {person.tasks.length === 0 ? (
                        <p className="text-muted" style={{ padding: "var(--space-2) 0" }}>
                          Keine Tasks diese Woche fällig.
                        </p>
                      ) : (
                        <ul className="list-plain">
                          {person.tasks.map((task) => (
                            <li key={task.id}>
                              <span>
                                {task.title} <span className="text-faint">({task.projectName})</span>
                              </span>
                              <span className="coord">{task.estimatedHours ?? "—"}h</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
