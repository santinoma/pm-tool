"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { computeSectionTotals } from "@/tenant/budgetingV2/sectionMath";

interface Section {
  id: string;
  name: string;
  budgetedTimeHours: number | null;
  quantity: number;
  price: number;
  budgetUsed: number;
  assigneeIds: string[];
  assigneeLabels: string[];
}

interface UserOption {
  id: string;
  label: string;
}

function SectionRow({
  section,
  users,
  canManage,
  onSaved,
}: {
  section: Section;
  users: UserOption[];
  canManage: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(section.name);
  const [budgetedTimeHours, setBudgetedTimeHours] = useState(section.budgetedTimeHours?.toString() ?? "");
  const [quantity, setQuantity] = useState(section.quantity.toString());
  const [price, setPrice] = useState(section.price.toString());
  const [budgetUsed, setBudgetUsed] = useState(section.budgetUsed.toString());
  const [assigneeIds, setAssigneeIds] = useState<string[]>(section.assigneeIds);
  const [saving, setSaving] = useState(false);

  const totals = computeSectionTotals(section);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/tenant/budget-sections/${section.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        budgetedTimeHours: budgetedTimeHours.trim() === "" ? null : Number(budgetedTimeHours),
        quantity: Number(quantity),
        price: Number(price),
        budgetUsed: Number(budgetUsed),
        assigneeIds,
      }),
    });
    setSaving(false);
    setEditing(false);
    onSaved();
  }

  async function handleDelete() {
    await fetch(`/api/tenant/budget-sections/${section.id}`, { method: "DELETE" });
    onSaved();
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={9}>
          <div className="row" style={{ gap: "var(--space-2)", flexWrap: "wrap", padding: "var(--space-3) 0" }}>
            <input className="input" style={{ width: "160px" }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <input className="input" style={{ width: "100px" }} type="number" value={budgetedTimeHours} onChange={(e) => setBudgetedTimeHours(e.target.value)} placeholder="Zeit (h)" />
            <input className="input" style={{ width: "90px" }} type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" />
            <input className="input" style={{ width: "90px" }} type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" />
            <input className="input" style={{ width: "100px" }} type="number" value={budgetUsed} onChange={(e) => setBudgetUsed(e.target.value)} placeholder="Used" />
            <select
              className="select"
              multiple
              style={{ width: "180px", height: "60px" }}
              value={assigneeIds}
              onChange={(e) => setAssigneeIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
              Speichern
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">
              Abbrechen
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{section.name}</td>
      <td className="text-muted">{section.assigneeLabels.join(", ") || "—"}</td>
      <td className="coord" style={{ textAlign: "right" }}>{section.budgetedTimeHours ?? "—"}</td>
      <td className="coord" style={{ textAlign: "right" }}>{section.quantity}</td>
      <td className="coord" style={{ textAlign: "right" }}>{section.price.toFixed(2)}</td>
      <td className="coord" style={{ textAlign: "right" }}>{totals.budgetTotal.toFixed(2)}</td>
      <td className="coord" style={{ textAlign: "right" }}>{section.budgetUsed.toFixed(2)}</td>
      <td className="coord" style={{ textAlign: "right" }}>{totals.budgetRemaining.toFixed(2)}</td>
      <td style={{ textAlign: "right" }}>
        <span className="row" style={{ justifyContent: "flex-end", gap: "var(--space-2)" }}>
          <span className="coord">{totals.usagePercent.toFixed(0)}%</span>
          {canManage && (
            <>
              <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost btn-sm">
                Bearbeiten
              </button>
              <button type="button" onClick={handleDelete} className="btn btn-danger btn-sm">
                Löschen
              </button>
            </>
          )}
        </span>
      </td>
    </tr>
  );
}

export function BudgetDetailClient({
  projectId,
  canManage,
  budget,
  sections,
  users,
}: {
  projectId: string;
  canManage: boolean;
  budget: { id: string; title: string; ownerLabel: string };
  sections: Section[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [budgetedTimeHours, setBudgetedTimeHours] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/tenant/budgets/${budget.id}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        budgetedTimeHours: budgetedTimeHours.trim() === "" ? null : Number(budgetedTimeHours),
        quantity: Number(quantity),
        price: Number(price),
        assigneeIds,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Section konnte nicht angelegt werden.");
      return;
    }
    setName("");
    setBudgetedTimeHours("");
    setQuantity("");
    setPrice("");
    setAssigneeIds([]);
    setCreating(false);
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "1080px" }}>
      <Link href={`/financials/${projectId}`} className="text-faint coord" style={{ fontSize: "var(--text-xs)" }}>
        ← Budgets
      </Link>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 style={{ marginTop: "var(--space-1)" }}>{budget.title}</h1>
          <p className="text-muted">Owner: {budget.ownerLabel}</p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setCreating((c) => !c)} className="btn btn-primary">
            Neue Section
          </button>
        )}
      </div>

      {creating && (
        <form
          onSubmit={handleCreate}
          className="card"
          style={{ marginBottom: "var(--space-6)", display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <input className="input" style={{ width: "180px" }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (z. B. Lead & PM Steuerung)" required />
          <input className="input" style={{ width: "110px" }} type="number" value={budgetedTimeHours} onChange={(e) => setBudgetedTimeHours(e.target.value)} placeholder="Zeit (h)" />
          <input className="input" style={{ width: "100px" }} type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" required />
          <input className="input" style={{ width: "100px" }} type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" required />
          <select
            className="select"
            multiple
            style={{ width: "200px", height: "60px" }}
            value={assigneeIds}
            onChange={(e) => setAssigneeIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            Anlegen
          </button>
          {error && <p className="field-error">{error}</p>}
        </form>
      )}

      {sections.length === 0 ? (
        <div className="empty-state">
          <h3>Noch keine Sections</h3>
          <p>Lege die erste Section (Service) für dieses Budget an.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Personen</th>
                <th style={{ textAlign: "right" }}>Zeit (h)</th>
                <th style={{ textAlign: "right" }}>Quantity</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>Budget Total</th>
                <th style={{ textAlign: "right" }}>Used</th>
                <th style={{ textAlign: "right" }}>Remaining</th>
                <th style={{ textAlign: "right" }}>Usage</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  users={users}
                  canManage={canManage}
                  onSaved={() => router.refresh()}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
