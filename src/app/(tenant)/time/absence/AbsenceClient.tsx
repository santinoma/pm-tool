"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LegendKey } from "@/ui/components/LegendKey";

interface MyRequest {
  id: string;
  type: "vacation" | "sick";
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
}

interface QueueItem {
  id: string;
  type: "vacation" | "sick";
  startDate: string;
  endDate: string;
  note: string | null;
  userName: string;
}

const TYPE_LABELS: Record<MyRequest["type"], string> = { vacation: "Urlaub", sick: "Krankheit" };
const STATUS_VARIANT: Record<MyRequest["status"], "warning" | "done" | "danger"> = {
  pending: "warning",
  approved: "done",
  rejected: "danger",
};
const STATUS_LABELS: Record<MyRequest["status"], string> = {
  pending: "Ausstehend",
  approved: "Genehmigt",
  rejected: "Abgelehnt",
};

export function AbsenceClient({
  isAdmin,
  myRequests,
  pendingQueue,
}: {
  isAdmin: boolean;
  myRequests: MyRequest[];
  pendingQueue: QueueItem[];
}) {
  const router = useRouter();
  const [type, setType] = useState<MyRequest["type"]>("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/absence-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, startDate, endDate, note: note || null }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Antrag konnte nicht gestellt werden.");
      return;
    }
    setStartDate("");
    setEndDate("");
    setNote("");
    router.refresh();
  }

  async function handleReview(id: string, status: "approved" | "rejected") {
    await fetch(`/api/tenant/absence-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-6)" }}>Book Absence</h1>

      <h2 style={{ marginBottom: "var(--space-3)" }}>Neuer Antrag</h2>
      <form onSubmit={handleSubmit} className="row" style={{ gap: "var(--space-3)", marginBottom: "var(--space-8)", flexWrap: "wrap" }}>
        <select className="select" value={type} onChange={(event) => setType(event.target.value as MyRequest["type"])}>
          <option value="vacation">Urlaub</option>
          <option value="sick">Krankheit</option>
        </select>
        <input
          type="date"
          className="input"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          required
        />
        <input
          type="date"
          className="input"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Notiz (optional)"
          className="input"
          style={{ flex: 1, minWidth: "180px" }}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={saving}>
          Beantragen
        </button>
      </form>

      {error && <p className="field-error" style={{ marginBottom: "var(--space-6)" }}>{error}</p>}

      {isAdmin && (
        <>
          <h2 style={{ marginBottom: "var(--space-3)" }}>Genehmigungs-Queue</h2>
          {pendingQueue.length === 0 ? (
            <p className="text-muted" style={{ marginBottom: "var(--space-8)" }}>
              Keine offenen Anträge.
            </p>
          ) : (
            <div className="table-wrap" style={{ marginBottom: "var(--space-8)" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Typ</th>
                    <th>Zeitraum</th>
                    <th>Notiz</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingQueue.map((item) => (
                    <tr key={item.id}>
                      <td>{item.userName}</td>
                      <td>{TYPE_LABELS[item.type]}</td>
                      <td className="coord">
                        {item.startDate} – {item.endDate}
                      </td>
                      <td className="text-muted">{item.note ?? "—"}</td>
                      <td className="row" style={{ gap: "var(--space-2)" }}>
                        <button type="button" onClick={() => handleReview(item.id, "approved")} className="btn btn-primary btn-sm">
                          Genehmigen
                        </button>
                        <button type="button" onClick={() => handleReview(item.id, "rejected")} className="btn btn-secondary btn-sm">
                          Ablehnen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <h2 style={{ marginBottom: "var(--space-3)" }}>Meine Anträge</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Typ</th>
              <th>Zeitraum</th>
              <th>Status</th>
              <th>Notiz</th>
            </tr>
          </thead>
          <tbody>
            {myRequests.map((request) => (
              <tr key={request.id}>
                <td>{TYPE_LABELS[request.type]}</td>
                <td className="coord">
                  {request.startDate} – {request.endDate}
                </td>
                <td>
                  <LegendKey label={STATUS_LABELS[request.status]} variant={STATUS_VARIANT[request.status]} />
                </td>
                <td className="text-muted">{request.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
