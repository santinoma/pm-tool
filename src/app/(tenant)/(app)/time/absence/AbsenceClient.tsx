"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LegendKey } from "@/ui/components/LegendKey";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

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
    <div className="pb-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Book Absence</h1>

      <h2 className="mb-3 text-lg font-semibold">Neuer Antrag</h2>
      <form onSubmit={handleSubmit} className="mb-8 flex flex-wrap gap-3">
        <Select value={type} onValueChange={(value) => setType(value as MyRequest["type"])}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vacation">Urlaub</SelectItem>
            <SelectItem value="sick">Krankheit</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required className="w-auto" />
        <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required className="w-auto" />
        <Input placeholder="Notiz (optional)" value={note} onChange={(event) => setNote(event.target.value)} className="min-w-44 flex-1" />
        <Button type="submit" loading={saving}>
          Beantragen
        </Button>
      </form>

      {error && <p className="mb-6 text-sm text-destructive">{error}</p>}

      {isAdmin && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Genehmigungs-Queue</h2>
          {pendingQueue.length === 0 ? (
            <p className="mb-8 text-sm text-muted-foreground">Keine offenen Anträge.</p>
          ) : (
            <div className="mb-8 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Zeitraum</TableHead>
                    <TableHead>Notiz</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingQueue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.userName}</TableCell>
                      <TableCell>{TYPE_LABELS[item.type]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.startDate} – {item.endDate}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.note ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleReview(item.id, "approved")}>
                            Genehmigen
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleReview(item.id, "rejected")}>
                            Ablehnen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      <h2 className="mb-3 text-lg font-semibold">Meine Anträge</h2>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Typ</TableHead>
              <TableHead>Zeitraum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notiz</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{TYPE_LABELS[request.type]}</TableCell>
                <TableCell className="text-muted-foreground">
                  {request.startDate} – {request.endDate}
                </TableCell>
                <TableCell>
                  <LegendKey label={STATUS_LABELS[request.status]} variant={STATUS_VARIANT[request.status]} />
                </TableCell>
                <TableCell className="text-muted-foreground">{request.note ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
