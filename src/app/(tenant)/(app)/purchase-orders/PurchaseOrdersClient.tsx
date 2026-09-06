"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LegendKey } from "@/ui/components/LegendKey";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

interface ProjectOption {
  id: string;
  name: string;
}

type Status = "draft" | "finalized" | "cancelled";
type SentStatus = "not_sent" | "sent";
type PaymentStatus = "not_received" | "partially_received" | "fully_received";

interface PurchaseOrder {
  id: string;
  vendorName: string;
  amount: number;
  status: Status;
  sentStatus: SentStatus;
  paymentStatus: PaymentStatus;
  orderedAt: string;
  projectId: string;
  projectName: string;
}

type LegendVariant = "default" | "started" | "done" | "warning" | "danger";

const STATUS_LABELS: Record<Status, string> = { draft: "Entwurf", finalized: "Finalisiert", cancelled: "Storniert" };
const STATUS_VARIANT: Record<Status, LegendVariant> = { draft: "default", finalized: "started", cancelled: "danger" };

const SENT_STATUS_LABELS: Record<SentStatus, string> = { not_sent: "Nicht versendet", sent: "Versendet" };
const SENT_STATUS_VARIANT: Record<SentStatus, LegendVariant> = { not_sent: "default", sent: "started" };

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  not_received: "Nicht erhalten",
  partially_received: "Teilweise erhalten",
  fully_received: "Vollständig erhalten",
};
const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, LegendVariant> = {
  not_received: "default",
  partially_received: "warning",
  fully_received: "done",
};

export function PurchaseOrdersClient({ projects, purchaseOrders }: { projects: ProjectOption[]; purchaseOrders: PurchaseOrder[] }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [sentStatus, setSentStatus] = useState<SentStatus>("not_sent");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("not_received");
  const [orderedAt, setOrderedAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        vendorName,
        amount: Number(amount),
        status,
        sentStatus,
        paymentStatus,
        orderedAt: orderedAt || undefined,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Bestellung konnte nicht angelegt werden.");
      return;
    }
    setVendorName("");
    setAmount("");
    setStatus("draft");
    setSentStatus("not_sent");
    setPaymentStatus("not_received");
    setOrderedAt("");
    router.refresh();
  }

  return (
    <div className="py-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Bestellungen</h1>
      <p className="mb-6 text-sm text-muted-foreground">Alle Bestellungen projektübergreifend.</p>

      {projects.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Neue Bestellung</h2>
          <form onSubmit={handleSubmit} className="mb-8 flex flex-wrap gap-3">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Projekt" /></SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Lieferant"
              value={vendorName}
              onChange={(event) => setVendorName(event.target.value)}
              required
              className="min-w-44 flex-1"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Betrag"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              className="w-32"
            />
            <Select value={status} onValueChange={(value) => setStatus(value as Status)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as Status[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {STATUS_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sentStatus} onValueChange={(value) => setSentStatus(value as SentStatus)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SENT_STATUS_LABELS) as SentStatus[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SENT_STATUS_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PAYMENT_STATUS_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={orderedAt} onChange={(event) => setOrderedAt(event.target.value)} className="w-auto" />
            <Button type="submit" loading={saving}>
              Anlegen
            </Button>
          </form>
          {error && <p className="mb-6 text-sm text-destructive">{error}</p>}
        </>
      )}

      {purchaseOrders.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Bestellungen</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lieferant</TableHead>
                <TableHead>Projekt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent status</TableHead>
                <TableHead>Payment status</TableHead>
                <TableHead>Betrag</TableHead>
                <TableHead>Datum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-semibold">{po.vendorName}</TableCell>
                  <TableCell className="text-muted-foreground">{po.projectName}</TableCell>
                  <TableCell>
                    <LegendKey label={STATUS_LABELS[po.status]} variant={STATUS_VARIANT[po.status]} />
                  </TableCell>
                  <TableCell>
                    <LegendKey label={SENT_STATUS_LABELS[po.sentStatus]} variant={SENT_STATUS_VARIANT[po.sentStatus]} />
                  </TableCell>
                  <TableCell>
                    <LegendKey label={PAYMENT_STATUS_LABELS[po.paymentStatus]} variant={PAYMENT_STATUS_VARIANT[po.paymentStatus]} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{po.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(po.orderedAt).toLocaleDateString("de-DE")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
