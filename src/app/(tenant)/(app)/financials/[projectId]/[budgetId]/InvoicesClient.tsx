"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { NumericCell } from "@/ui/nextelite/NumericCell";

interface LineItem {
  description: string;
  quantityHours: number;
  rate: number;
  amount: number;
  taxRatePercent: number | null;
}

interface Payment {
  id: string;
  amount: number;
  paidAt: string;
  note: string | null;
}

interface CreditNote {
  id: string;
  amount: number;
  reason: string | null;
}

type InvoiceStatus = "draft" | "finalized" | "sent" | "partially_paid" | "paid";
type InvoicingMethod = "uninvoiced_time_expenses" | "remaining_amount" | "percentage" | null;

interface InvoiceRow {
  id: string;
  status: InvoiceStatus;
  invoicingMethod: InvoicingMethod;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  paidAmount: number;
  finalizedAt: string | null;
  lineItems: LineItem[];
  payments: Payment[];
  creditNotes: CreditNote[];
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Entwurf",
  finalized: "Finalisiert",
  sent: "Versendet",
  partially_paid: "Teilweise bezahlt",
  paid: "Bezahlt",
};

const STATUS_BADGE_VARIANT: Record<InvoiceStatus, "outline" | "warningOutline" | "primaryOutline" | "successOutline"> = {
  draft: "outline",
  finalized: "warningOutline",
  sent: "primaryOutline",
  partially_paid: "warningOutline",
  paid: "successOutline",
};

const METHOD_LABELS: Record<string, string> = {
  uninvoiced_time_expenses: "Nicht abgerechnete Zeiten/Ausgaben",
  remaining_amount: "Restbetrag",
  percentage: "Prozentsatz",
};

function outstandingBalance(invoice: InvoiceRow): number {
  const creditTotal = invoice.creditNotes.reduce((sum, note) => sum + note.amount, 0);
  return invoice.totalAmount - invoice.paidAmount - creditTotal;
}

function taxTotal(invoice: InvoiceRow): number {
  return invoice.lineItems.reduce((sum, item) => sum + item.amount * ((item.taxRatePercent ?? 0) / 100), 0);
}

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
  const [invoicingMethod, setInvoicingMethod] = useState<"uninvoiced_time_expenses" | "remaining_amount" | "percentage">(
    "uninvoiced_time_expenses",
  );
  const [percentage, setPercentage] = useState("50");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch(`/api/tenant/budgets/${budgetId}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodStart,
        periodEnd,
        invoicingMethod,
        percentage: invoicingMethod === "percentage" ? Number(percentage) : undefined,
      }),
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

  async function handleFinalize(invoiceId: string) {
    if (!confirm("Rechnung finalisieren? Danach können die Positionen nicht mehr geändert werden.")) return;
    await fetch(`/api/tenant/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "finalized" }),
    });
    router.refresh();
  }

  async function handleMarkSent(invoiceId: string) {
    await fetch(`/api/tenant/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    router.refresh();
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Rechnungen</h2>

      {canManage && (
        <form onSubmit={handleCreate} className="mb-6 flex flex-wrap gap-3">
          <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} required className="w-auto" />
          <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} required className="w-auto" />
          <Select value={invoicingMethod} onValueChange={(value) => setInvoicingMethod(value as typeof invoicingMethod)}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="uninvoiced_time_expenses">Nicht abgerechnete Zeiten/Ausgaben</SelectItem>
              <SelectItem value="remaining_amount">Restbetrag</SelectItem>
              <SelectItem value="percentage">Prozentsatz</SelectItem>
            </SelectContent>
          </Select>
          {invoicingMethod === "percentage" && (
            <Input type="number" min={0} max={100} value={percentage} onChange={(event) => setPercentage(event.target.value)} required className="w-24" />
          )}
          <Button type="submit" loading={saving}>
            Rechnung erstellen
          </Button>
        </form>
      )}

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Rechnungen.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {invoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} canManage={canManage} onFinalize={handleFinalize} onMarkSent={handleMarkSent} />
          ))}
        </div>
      )}
    </div>
  );
}

function InvoiceCard({
  invoice,
  canManage,
  onFinalize,
  onMarkSent,
}: {
  invoice: InvoiceRow;
  canManage: boolean;
  onFinalize: (id: string) => void;
  onMarkSent: (id: string) => void;
}) {
  const router = useRouter();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditSaving, setCreditSaving] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);

  async function handleRecordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentError(null);
    setPaymentSaving(true);
    const response = await fetch(`/api/tenant/invoices/${invoice.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(paymentAmount), paidAt: paymentDate, note: paymentNote || undefined }),
    });
    setPaymentSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setPaymentError(body.error ?? "Zahlung konnte nicht erfasst werden.");
      return;
    }
    setPaymentAmount("");
    setPaymentDate("");
    setPaymentNote("");
    router.refresh();
  }

  async function handleRecordCreditNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreditError(null);
    setCreditSaving(true);
    const response = await fetch(`/api/tenant/invoices/${invoice.id}/credit-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(creditAmount), reason: creditReason || undefined }),
    });
    setCreditSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setCreditError(body.error ?? "Gutschrift konnte nicht erfasst werden.");
      return;
    }
    setCreditAmount("");
    setCreditReason("");
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <strong className="text-sm">
            {invoice.periodStart} – {invoice.periodEnd}
          </strong>
          <div className="flex items-center gap-2">
            {invoice.invoicingMethod && <span className="text-xs text-muted-foreground">{METHOD_LABELS[invoice.invoicingMethod] ?? invoice.invoicingMethod}</span>}
            <span className="font-mono text-sm">{invoice.totalAmount.toFixed(2)}</span>
            <Badge variant={STATUS_BADGE_VARIANT[invoice.status]}>{STATUS_LABELS[invoice.status]}</Badge>
          </div>
        </div>

        {canManage && (
          <div className="mb-3 flex gap-2">
            {invoice.status === "draft" && (
              <Button variant="outline" size="sm" onClick={() => onFinalize(invoice.id)}>
                Finalisieren
              </Button>
            )}
            {invoice.status === "finalized" && (
              <Button variant="outline" size="sm" onClick={() => onMarkSent(invoice.id)}>
                Als versendet markieren
              </Button>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead className="text-right">Stunden</TableHead>
                <TableHead className="text-right">Satz</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead className="text-right">Steuer %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.description}</TableCell>
                  <NumericCell value={item.quantityHours} />
                  <NumericCell value={item.rate} />
                  <NumericCell value={item.amount} />
                  <NumericCell value={item.taxRatePercent} format="percent" />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-2 flex flex-wrap justify-end gap-4 text-sm">
          <span className="text-muted-foreground">Steuer gesamt: {taxTotal(invoice).toFixed(2)}</span>
          <span className="text-muted-foreground">Bezahlt: {invoice.paidAmount.toFixed(2)}</span>
          <strong>Offener Betrag: {outstandingBalance(invoice).toFixed(2)}</strong>
        </div>

        <div className="mt-4 flex flex-wrap items-start gap-4">
          <div className="min-w-64 flex-1">
            <h4 className="mb-2 text-sm font-semibold">Zahlungen</h4>
            {invoice.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Zahlungen erfasst.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {invoice.payments.map((payment) => (
                  <li key={payment.id}>
                    {payment.paidAt} — {payment.amount.toFixed(2)}
                    {payment.note ? ` (${payment.note})` : ""}
                  </li>
                ))}
              </ul>
            )}
            {canManage && (invoice.status === "sent" || invoice.status === "partially_paid") && (
              <form onSubmit={handleRecordPayment} className="mt-2 flex flex-col gap-2">
                <Input type="number" step="0.01" placeholder="Betrag" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required />
                <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
                <Input placeholder="Notiz (optional)" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} />
                {paymentError && <p className="text-sm text-destructive">{paymentError}</p>}
                <Button type="submit" variant="outline" size="sm" loading={paymentSaving}>
                  Zahlung erfassen
                </Button>
              </form>
            )}
          </div>

          <div className="min-w-64 flex-1">
            <h4 className="mb-2 text-sm font-semibold">Gutschriften</h4>
            {invoice.creditNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Gutschriften erfasst.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {invoice.creditNotes.map((note) => (
                  <li key={note.id}>
                    {note.amount.toFixed(2)}
                    {note.reason ? ` (${note.reason})` : ""}
                  </li>
                ))}
              </ul>
            )}
            {canManage && (invoice.status === "sent" || invoice.status === "partially_paid" || invoice.status === "paid") && (
              <form onSubmit={handleRecordCreditNote} className="mt-2 flex flex-col gap-2">
                <Input type="number" step="0.01" placeholder="Betrag" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} required />
                <Input placeholder="Grund (optional)" value={creditReason} onChange={(event) => setCreditReason(event.target.value)} />
                {creditError && <p className="text-sm text-destructive">{creditError}</p>}
                <Button type="submit" variant="outline" size="sm" loading={creditSaving}>
                  Gutschrift erfassen
                </Button>
              </form>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
