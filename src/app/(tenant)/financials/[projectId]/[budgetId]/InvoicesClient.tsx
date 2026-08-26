"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LineItem {
  description: string;
  quantityHours: number;
  rate: number;
  amount: number;
}

interface InvoiceRow {
  id: string;
  status: "draft" | "sent" | "paid";
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  lineItems: LineItem[];
}

const STATUS_LABELS: Record<InvoiceRow["status"], string> = {
  draft: "Entwurf",
  sent: "Versendet",
  paid: "Bezahlt",
};

export function InvoicesClient({
  budgetId,
  canManage,
  invoices,
}: {
  budgetId: string;
  canManage: boolean;
  invoices: InvoiceRow[];
}) {
  const router = useRouter();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch(`/api/tenant/budgets/${budgetId}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodStart, periodEnd }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Rechnung konnte nicht erstellt werden.");
      return;
    }
    setPeriodStart("");
    setPeriodEnd("");
    router.refresh();
  }

  async function handleStatusChange(invoiceId: string, status: InvoiceRow["status"]) {
    await fetch(`/api/tenant/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "900px" }}>
      <h2 style={{ marginBottom: "var(--space-3)" }}>Rechnungen</h2>

      {canManage && (
        <form onSubmit={handleCreate} className="row" style={{ gap: "var(--space-3)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
          <input
            type="date"
            className="input"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
            required
          />
          <input
            type="date"
            className="input"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Rechnung erstellen
          </button>
        </form>
      )}

      {error && <p className="field-error" style={{ marginBottom: "var(--space-4)" }}>{error}</p>}

      {invoices.length === 0 ? (
        <p className="text-muted">Noch keine Rechnungen.</p>
      ) : (
        <div className="stack" style={{ gap: "var(--space-4)" }}>
          {invoices.map((invoice) => (
            <div key={invoice.id} className="widget-card">
              <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                <strong>
                  {invoice.periodStart} – {invoice.periodEnd}
                </strong>
                <div className="row" style={{ gap: "var(--space-2)" }}>
                  <span className="coord">{invoice.totalAmount.toFixed(2)}</span>
                  {canManage ? (
                    <select
                      className="select"
                      value={invoice.status}
                      onChange={(event) => handleStatusChange(invoice.id, event.target.value as InvoiceRow["status"])}
                    >
                      <option value="draft">Entwurf</option>
                      <option value="sent">Versendet</option>
                      <option value="paid">Bezahlt</option>
                    </select>
                  ) : (
                    <span>{STATUS_LABELS[invoice.status]}</span>
                  )}
                </div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th className="coord">Stunden</th>
                    <th className="coord">Satz</th>
                    <th className="coord">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.description}</td>
                      <td className="coord">{item.quantityHours.toFixed(2)}</td>
                      <td className="coord">{item.rate.toFixed(2)}</td>
                      <td className="coord">{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
