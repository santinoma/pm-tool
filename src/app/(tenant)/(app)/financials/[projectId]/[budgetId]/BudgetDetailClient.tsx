"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Receipt, Calendar as CalendarIcon } from "lucide-react";
import { computeSectionTotals } from "@/tenant/budgetingV2/sectionMath";
import { PROJECT_COLOR_PALETTE } from "@/tenant/projects/colorPalette";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Progress } from "@/ui/shadcn/components/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/shadcn/components/tabs";
import { cn } from "@/ui/shadcn/lib/utils";

interface Section {
  id: string;
  name: string;
  description: string | null;
  budgetedTimeHours: number | null;
  estimatedCost: number | null;
  quantity: number;
  price: number;
  budgetUsed: number;
  serviceTypeId: string | null;
  billingType: string;
  trackingUnit: string;
  discountPercent: number | null;
  markupPercent: number | null;
  guaranteedMaxPrice: number | null;
  warningThresholdPercent: number | null;
  blockOverrun: boolean;
  trackTime: boolean;
  trackExpenses: boolean;
  trackBooking: boolean;
  position: number;
  assigneeIds: string[];
  assigneeLabels: string[];
}

interface UserOption {
  id: string;
  label: string;
}

interface ServiceTypeOption {
  id: string;
  name: string;
}

interface RateCardItemOption {
  id: string;
  name: string;
  serviceTypeId: string | null;
  billingType: string;
  trackingUnit: string;
  defaultPrice: number;
}

interface CustomFieldDef {
  id: string;
  key: string;
  label: string;
  type: string;
  options: string[];
}

interface CustomFieldValue {
  fieldId: string;
  value: string;
}

interface ScenarioRow {
  id: string;
  title: string;
  ownerLabel: string;
  sectionCount: number;
}

interface FeedEvent {
  id: string;
  type: string;
  summary: string;
  actorLabel: string;
  createdAt: string;
}

interface TimeEntryRow {
  id: string;
  userLabel: string;
  sectionName: string;
  description: string | null;
  durationMinutes: number | null;
  amount: number | null;
  createdAt: string;
}

const BILLING_TYPE_LABELS: Record<string, string> = {
  time_and_materials: "Time & Materials",
  fixed: "Fixed",
  percentage: "Percentage",
  non_billable: "Non-billable",
};

const TRACKING_UNIT_LABELS: Record<string, string> = {
  hours: "Stunden",
  days: "Tage",
  piece: "Stück",
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  budget_created: "Budget angelegt",
  budget_updated: "Budget aktualisiert",
  budget_section_added: "Service hinzugefügt",
  budget_section_updated: "Service aktualisiert",
  budget_section_removed: "Service entfernt",
  invoice_created: "Rechnung erstellt",
};

function SectionEditRow({
  section,
  users,
  serviceTypes,
  onSaved,
  onCancel,
}: {
  section: Section;
  users: UserOption[];
  serviceTypes: ServiceTypeOption[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(section.name);
  const [description, setDescription] = useState(section.description ?? "");
  const [budgetedTimeHours, setBudgetedTimeHours] = useState(section.budgetedTimeHours?.toString() ?? "");
  const [estimatedCost, setEstimatedCost] = useState(section.estimatedCost?.toString() ?? "");
  const [quantity, setQuantity] = useState(section.quantity.toString());
  const [price, setPrice] = useState(section.price.toString());
  const [budgetUsed, setBudgetUsed] = useState(section.budgetUsed.toString());
  const [serviceTypeId, setServiceTypeId] = useState(section.serviceTypeId ?? "__none__");
  const [billingType, setBillingType] = useState(section.billingType);
  const [trackingUnit, setTrackingUnit] = useState(section.trackingUnit);
  const [discountPercent, setDiscountPercent] = useState(section.discountPercent?.toString() ?? "");
  const [markupPercent, setMarkupPercent] = useState(section.markupPercent?.toString() ?? "");
  const [guaranteedMaxPrice, setGuaranteedMaxPrice] = useState(section.guaranteedMaxPrice?.toString() ?? "");
  const [warningThresholdPercent, setWarningThresholdPercent] = useState(section.warningThresholdPercent?.toString() ?? "");
  const [blockOverrun, setBlockOverrun] = useState(section.blockOverrun);
  const [trackTime, setTrackTime] = useState(section.trackTime);
  const [trackExpenses, setTrackExpenses] = useState(section.trackExpenses);
  const [trackBooking, setTrackBooking] = useState(section.trackBooking);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(section.assigneeIds);
  const [saving, setSaving] = useState(false);

  function toggleAssignee(userId: string) {
    setAssigneeIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/tenant/budget-sections/${section.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description.trim() === "" ? null : description,
        budgetedTimeHours: budgetedTimeHours.trim() === "" ? null : Number(budgetedTimeHours),
        estimatedCost: estimatedCost.trim() === "" ? null : Number(estimatedCost),
        quantity: Number(quantity),
        price: Number(price),
        budgetUsed: Number(budgetUsed),
        serviceTypeId: serviceTypeId === "__none__" ? null : serviceTypeId,
        billingType,
        trackingUnit,
        discountPercent: discountPercent.trim() === "" ? null : Number(discountPercent),
        markupPercent: markupPercent.trim() === "" ? null : Number(markupPercent),
        guaranteedMaxPrice: guaranteedMaxPrice.trim() === "" ? null : Number(guaranteedMaxPrice),
        warningThresholdPercent: warningThresholdPercent.trim() === "" ? null : Number(warningThresholdPercent),
        blockOverrun,
        trackTime,
        trackExpenses,
        trackBooking,
        assigneeIds,
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <TableRow>
      <TableCell colSpan={9}>
        <div className="flex flex-col gap-2 py-3">
          <div className="flex flex-wrap gap-2">
            <Input className="w-40" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— kein Service Type —</SelectItem>
                {serviceTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={billingType} onValueChange={setBillingType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(BILLING_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={trackingUnit} onValueChange={setTrackingUnit}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TRACKING_UNIT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beschreibung (optional)" />
          <div className="flex flex-wrap gap-2">
            <Input className="w-24" type="number" value={budgetedTimeHours} onChange={(e) => setBudgetedTimeHours(e.target.value)} placeholder="Zeit (h)" />
            <Input className="w-28" type="number" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="Est. Cost" />
            <Input className="w-24" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" />
            <Input className="w-24" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" />
            <Input className="w-24" type="number" value={budgetUsed} onChange={(e) => setBudgetUsed(e.target.value)} placeholder="Used" />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Input className="w-24" type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="Discount %" />
            <Input className="w-24" type="number" value={markupPercent} onChange={(e) => setMarkupPercent(e.target.value)} placeholder="Markup %" />
            <Input className="w-36" type="number" value={guaranteedMaxPrice} onChange={(e) => setGuaranteedMaxPrice(e.target.value)} placeholder="Guaranteed max price" />
            <Input className="w-32" type="number" value={warningThresholdPercent} onChange={(e) => setWarningThresholdPercent(e.target.value)} placeholder="Warnschwelle (%)" />
            <label className="flex items-center gap-1 text-xs">
              <Checkbox checked={blockOverrun} onCheckedChange={(c) => setBlockOverrun(c === true)} />
              Overrun blockieren
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={trackTime} onCheckedChange={(c) => setTrackTime(c === true)} />
              <Clock className="size-3.5" /> Time-Tracking
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={trackExpenses} onCheckedChange={(c) => setTrackExpenses(c === true)} />
              <Receipt className="size-3.5" /> Expense-Tracking
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={trackBooking} onCheckedChange={(c) => setTrackBooking(c === true)} />
              <CalendarIcon className="size-3.5" /> Booking
            </label>
          </div>
          <div className="flex max-w-md flex-wrap gap-2">
            {users.map((user) => (
              <label key={user.id} className="flex items-center gap-1.5 text-xs">
                <Checkbox checked={assigneeIds.includes(user.id)} onCheckedChange={() => toggleAssignee(user.id)} />
                {user.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} loading={saving}>
              Speichern
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Abbrechen
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SectionRow({
  section,
  users,
  serviceTypes,
  canManage,
  isFirst,
  isLast,
  onSaved,
  onMove,
}: {
  section: Section;
  users: UserOption[];
  serviceTypes: ServiceTypeOption[];
  canManage: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSaved: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const [editing, setEditing] = useState(false);
  const totals = computeSectionTotals(section);

  async function handleDelete() {
    await fetch(`/api/tenant/budget-sections/${section.id}`, { method: "DELETE" });
    onSaved();
  }

  async function handleDuplicate() {
    await fetch(`/api/tenant/budget-sections/${section.id}/duplicate`, { method: "POST" });
    onSaved();
  }

  if (editing) {
    return (
      <SectionEditRow
        section={section}
        users={users}
        serviceTypes={serviceTypes}
        onSaved={() => {
          setEditing(false);
          onSaved();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const usageOver = totals.usagePercent > 100;

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{section.name}</span>
          <Badge variant="outline">{BILLING_TYPE_LABELS[section.billingType] ?? section.billingType}</Badge>
        </div>
        {section.description && <div className="mt-0.5 text-xs text-muted-foreground">{section.description}</div>}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">{section.assigneeLabels.join(", ") || "—"}</span>
          {section.budgetedTimeHours !== null && <span className="text-muted-foreground">· {section.budgetedTimeHours}h geplant</span>}
          {section.trackTime && <Clock className="size-3.5 text-muted-foreground" aria-label="Time-Tracking" />}
          {section.trackExpenses && <Receipt className="size-3.5 text-muted-foreground" aria-label="Expense-Tracking" />}
          {section.trackBooking && <CalendarIcon className="size-3.5 text-muted-foreground" aria-label="Booking" />}
        </div>
      </TableCell>
      <TableCell className="text-right">
        {section.quantity} {TRACKING_UNIT_LABELS[section.trackingUnit] ?? section.trackingUnit}
      </TableCell>
      <TableCell className="text-right font-mono">{section.price.toFixed(2)}</TableCell>
      <TableCell className="text-right font-mono font-semibold">{totals.budgetTotal.toFixed(2)}</TableCell>
      <TableCell className="text-right font-mono">{section.budgetUsed.toFixed(2)}</TableCell>
      {/* Reference §04: "Budget remaining negativ & rot bei Überschreitung." */}
      <TableCell className={cn("text-right font-mono", totals.budgetRemaining < 0 && "text-destructive")}>
        {totals.budgetRemaining.toFixed(2)}
      </TableCell>
      <TableCell className="min-w-32">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{totals.usagePercent.toFixed(0)}%</span>
          {/* RAG kept separate from the brand accent — reference §Farbsemantik. */}
          <Progress value={Math.min(totals.usagePercent, 100)} variant={usageOver ? "destructive" : "success"} />
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant={section.guaranteedMaxPrice !== null ? "primaryOutline" : "outline"} title={section.guaranteedMaxPrice !== null ? `Guaranteed max: ${section.guaranteedMaxPrice.toFixed(2)}` : undefined}>
          {section.guaranteedMaxPrice !== null ? "Ja" : "Nein"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {canManage && (
          <div className="flex flex-wrap justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => onMove("up")} disabled={isFirst} title="Nach oben">
              ↑
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onMove("down")} disabled={isLast} title="Nach unten">
              ↓
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDuplicate}>
              Duplizieren
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Bearbeiten
            </Button>
            <Button variant="destructiveSubtle" size="sm" onClick={handleDelete}>
              Löschen
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function ServicesTab({
  budgetId,
  canManage,
  sections,
  users,
  serviceTypes,
  rateCardItems,
  onSaved,
}: {
  budgetId: string;
  canManage: boolean;
  sections: Section[];
  users: UserOption[];
  serviceTypes: ServiceTypeOption[];
  rateCardItems: RateCardItemOption[];
  onSaved: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [rateCardId, setRateCardId] = useState("__none__");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("__none__");
  const [billingType, setBillingType] = useState("time_and_materials");
  const [trackingUnit, setTrackingUnit] = useState("hours");
  const [budgetedTimeHours, setBudgetedTimeHours] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleMove(section: Section, direction: "up" | "down") {
    const index = sections.findIndex((s) => s.id === section.id);
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    const neighbor = sections[neighborIndex];
    if (!neighbor) return;
    await Promise.all([
      fetch(`/api/tenant/budget-sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: neighbor.position }),
      }),
      fetch(`/api/tenant/budget-sections/${neighbor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: section.position }),
      }),
    ]);
    onSaved();
  }

  function handleRateCardSelect(id: string) {
    setRateCardId(id);
    const item = rateCardItems.find((r) => r.id === id);
    if (!item) return;
    setName(item.name);
    setServiceTypeId(item.serviceTypeId ?? "__none__");
    setBillingType(item.billingType);
    setTrackingUnit(item.trackingUnit);
    setPrice(item.defaultPrice.toString());
    setQuantity((q) => q || "1");
  }

  function toggleAssignee(userId: string) {
    setAssigneeIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/tenant/budgets/${budgetId}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description.trim() === "" ? undefined : description,
        serviceTypeId: serviceTypeId === "__none__" ? undefined : serviceTypeId,
        billingType,
        trackingUnit,
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
    setRateCardId("__none__");
    setName("");
    setDescription("");
    setServiceTypeId("__none__");
    setBillingType("time_and_materials");
    setTrackingUnit("hours");
    setBudgetedTimeHours("");
    setQuantity("");
    setPrice("");
    setAssigneeIds([]);
    setCreating(false);
    onSaved();
  }

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreating((c) => !c)}>Neuer Service</Button>
        </div>
      )}

      {creating && (
        <form onSubmit={handleCreate} className="mb-6 flex flex-col gap-2 rounded-lg border p-4">
          {rateCardItems.length > 0 && (
            <Select value={rateCardId} onValueChange={handleRateCardSelect}>
              <SelectTrigger className="max-w-80"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— aus Rate Card übernehmen (optional) —</SelectItem>
                {rateCardItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.defaultPrice.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex flex-wrap gap-2">
            <Input className="w-44" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (z. B. Lead & PM Steuerung)" required />
            <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— kein Service Type —</SelectItem>
                {serviceTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={billingType} onValueChange={setBillingType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(BILLING_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={trackingUnit} onValueChange={setTrackingUnit}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TRACKING_UNIT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beschreibung (optional)" />
          <div className="flex flex-wrap items-end gap-2">
            <Input className="w-28" type="number" value={budgetedTimeHours} onChange={(e) => setBudgetedTimeHours(e.target.value)} placeholder="Zeit (h)" />
            <Input className="w-24" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" required />
            <Input className="w-24" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" required />
            <Button type="submit">Anlegen</Button>
          </div>
          <div className="flex max-w-md flex-wrap gap-2">
            {users.map((user) => (
              <label key={user.id} className="flex items-center gap-1.5 text-xs">
                <Checkbox checked={assigneeIds.includes(user.id)} onCheckedChange={() => toggleAssignee(user.id)} />
                {user.label}
              </label>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      )}

      {sections.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Services</h3>
          <p className="mt-1 text-sm text-muted-foreground">Lege den ersten Service für dieses Budget an.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section / Service</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Budget Total</TableHead>
                <TableHead className="text-right">Budget Used</TableHead>
                <TableHead className="text-right">Budget Remaining</TableHead>
                <TableHead>Budget Usage %</TableHead>
                <TableHead className="text-center">Guaranteed Max</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section, index) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  users={users}
                  serviceTypes={serviceTypes}
                  canManage={canManage}
                  isFirst={index === 0}
                  isLast={index === sections.length - 1}
                  onSaved={onSaved}
                  onMove={(direction) => handleMove(section, direction)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function CustomFieldsPanel({
  budgetId,
  customFieldDefs,
  customFieldValues,
  users,
  canManage,
  onSaved,
}: {
  budgetId: string;
  customFieldDefs: CustomFieldDef[];
  customFieldValues: CustomFieldValue[];
  users: UserOption[];
  canManage: boolean;
  onSaved: () => void;
}) {
  if (customFieldDefs.length === 0) return null;
  const valueByFieldId = new Map(customFieldValues.map((v) => [v.fieldId, v.value]));

  async function saveValue(fieldId: string, value: string) {
    await fetch(`/api/tenant/budgets/${budgetId}/custom-fields/${fieldId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    onSaved();
  }

  return (
    <div className="mb-6 rounded-lg border p-4">
      <h3 className="mb-3 text-base font-semibold">Custom Fields</h3>
      <div className="flex flex-col gap-3">
        {customFieldDefs.map((field) => {
          const current = valueByFieldId.get(field.id) ?? "";
          if (!canManage) {
            return (
              <div key={field.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{field.label}</span>
                <span>{current || "—"}</span>
              </div>
            );
          }
          if (field.type === "select") {
            return (
              <div key={field.id} className="flex flex-col gap-2">
                <Label>{field.label}</Label>
                <Select defaultValue={current || undefined} onValueChange={(value) => saveValue(field.id, value)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }
          if (field.type === "person") {
            return (
              <div key={field.id} className="flex flex-col gap-2">
                <Label>{field.label}</Label>
                <Select defaultValue={current || undefined} onValueChange={(value) => saveValue(field.id, value)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }
          return (
            <div key={field.id} className="flex flex-col gap-2">
              <Label>{field.label}</Label>
              <Input
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                defaultValue={current}
                onBlur={(e) => saveValue(field.id, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScenariosTab({
  projectId,
  budgetId,
  canManage,
  scenarios,
  onCreated,
}: {
  projectId: string;
  budgetId: string;
  canManage: boolean;
  scenarios: ScenarioRow[];
  onCreated: () => void;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleCreateScenario() {
    setCreating(true);
    await fetch(`/api/tenant/budgets/${budgetId}/scenarios`, { method: "POST" });
    setCreating(false);
    onCreated();
  }

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <Button onClick={handleCreateScenario} loading={creating}>
            Szenario erstellen
          </Button>
        </div>
      )}
      {scenarios.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Keine Szenarien</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Erstelle ein Szenario, um Änderungen an diesem Budget durchzuspielen, ohne das Live-Budget zu ändern.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Services</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((scenario) => (
                <TableRow key={scenario.id}>
                  <TableCell>{scenario.title}</TableCell>
                  <TableCell className="text-muted-foreground">{scenario.ownerLabel}</TableCell>
                  <TableCell className="text-muted-foreground">{scenario.sectionCount}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/financials/${projectId}/${scenario.id}`)}>
                      Öffnen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function FeedTab({ events }: { events: FeedEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border py-14 text-center">
        <h3 className="font-semibold">Noch keine Aktivität</h3>
        <p className="mt-1 text-sm text-muted-foreground">Änderungen an diesem Budget erscheinen hier.</p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {events.map((event) => (
        <li key={event.id}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{ACTIVITY_TYPE_LABELS[event.type] ?? event.type}</span>
            <span className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString("de-DE")}</span>
          </div>
          <div className="text-sm">{event.summary}</div>
          <div className="text-xs text-muted-foreground">{event.actorLabel}</div>
        </li>
      ))}
    </ul>
  );
}

function TimeTab({ entries }: { entries: TimeEntryRow[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border py-14 text-center">
        <h3 className="font-semibold">Keine Zeiteinträge</h3>
        <p className="mt-1 text-sm text-muted-foreground">Zeiteinträge, die gegen Services dieses Budgets gebucht wurden, erscheinen hier.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Person</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Beschreibung</TableHead>
            <TableHead className="text-right">Dauer</TableHead>
            <TableHead className="text-right">Betrag</TableHead>
            <TableHead className="text-right">Datum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{entry.userLabel}</TableCell>
              <TableCell className="text-muted-foreground">{entry.sectionName}</TableCell>
              <TableCell className="text-muted-foreground">{entry.description ?? "—"}</TableCell>
              <TableCell className="text-right font-mono">{entry.durationMinutes !== null ? `${(entry.durationMinutes / 60).toFixed(2)}h` : "—"}</TableCell>
              <TableCell className="text-right font-mono">{entry.amount !== null ? entry.amount.toFixed(2) : "—"}</TableCell>
              <TableCell className="text-right text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString("de-DE")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type TabKey = "services" | "time" | "invoices" | "scenarios" | "feed";

export function BudgetDetailClient({
  projectId,
  canManage,
  budget,
  sections,
  users,
  serviceTypes,
  rateCardItems,
  customFieldDefs,
  customFieldValues,
  scenarios,
  feedEvents,
  timeEntries,
  invoicesTab,
  retainerBurnTab,
}: {
  projectId: string;
  canManage: boolean;
  budget: {
    id: string;
    title: string;
    ownerLabel: string;
    ownerId: string;
    startDate: string | null;
    endDate: string | null;
    color: string | null;
    isScenario: boolean;
    isTemplate: boolean;
    scenarioOf: { id: string; title: string } | null;
    deliveredAt: string | null;
  };
  sections: Section[];
  users: UserOption[];
  serviceTypes: ServiceTypeOption[];
  rateCardItems: RateCardItemOption[];
  customFieldDefs: CustomFieldDef[];
  customFieldValues: CustomFieldValue[];
  scenarios: ScenarioRow[];
  feedEvents: FeedEvent[];
  timeEntries: TimeEntryRow[];
  invoicesTab: ReactNode;
  retainerBurnTab: ReactNode;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("services");
  const [editingHeader, setEditingHeader] = useState(false);
  const [startDate, setStartDate] = useState(budget.startDate ?? "");
  const [endDate, setEndDate] = useState(budget.endDate ?? "");
  const [color, setColor] = useState(budget.color ?? PROJECT_COLOR_PALETTE[0]);
  const [isTemplate, setIsTemplate] = useState(budget.isTemplate);
  const [promoting, setPromoting] = useState(false);
  const [deliverBusy, setDeliverBusy] = useState(false);

  function onSaved() {
    router.refresh();
  }

  async function handleSaveHeader() {
    await fetch(`/api/tenant/budgets/${budget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: startDate || null,
        endDate: endDate || null,
        color,
        isTemplate,
      }),
    });
    setEditingHeader(false);
    onSaved();
  }

  async function handlePromote() {
    setPromoting(true);
    const response = await fetch(`/api/tenant/budgets/${budget.id}/promote`, { method: "POST" });
    const data = await response.json();
    setPromoting(false);
    if (response.ok) {
      router.push(`/financials/${projectId}/${data.budgetId}`);
    }
  }

  async function handleDeliver() {
    if (!window.confirm("Budget wirklich als geliefert markieren? Danach sind keine weiteren Buchungen gegen die Services mehr möglich.")) {
      return;
    }
    setDeliverBusy(true);
    await fetch(`/api/tenant/budgets/${budget.id}/deliver`, { method: "POST" });
    setDeliverBusy(false);
    onSaved();
  }

  async function handleUndeliver() {
    if (!window.confirm("Lieferung dieses Budgets wirklich zurücknehmen?")) {
      return;
    }
    setDeliverBusy(true);
    await fetch(`/api/tenant/budgets/${budget.id}/undeliver`, { method: "POST" });
    setDeliverBusy(false);
    onSaved();
  }

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <Link href={`/financials/${projectId}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Budgets
      </Link>

      {budget.isScenario && budget.scenarioOf && (
        <div className="mt-2 mb-4 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">
              Dies ist ein <strong>Szenario</strong> von{" "}
              <Link href={`/financials/${projectId}/${budget.scenarioOf.id}`} className="hover:text-primary hover:underline">
                {budget.scenarioOf.title}
              </Link>
              .
            </span>
            {canManage && (
              <Button size="sm" onClick={handlePromote} loading={promoting}>
                Als Live-Budget übernehmen
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: budget.color ?? "var(--border)" }} />
            <h1 className="text-2xl font-bold tracking-tight">{budget.title}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Owner: {budget.ownerLabel}</p>
          <p className="text-xs text-muted-foreground">
            {budget.startDate ?? "—"} – {budget.endDate ?? "—"}
          </p>
          {budget.deliveredAt && (
            <Badge variant="primaryOutline" className="mt-2">
              Geliefert am {new Date(budget.deliveredAt).toLocaleDateString("de-DE")}
            </Badge>
          )}
        </div>
        {canManage && (
          <div className="flex gap-2">
            {budget.deliveredAt ? (
              <Button variant="outline" size="sm" onClick={handleUndeliver} loading={deliverBusy}>
                Lieferung zurücknehmen
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleDeliver} loading={deliverBusy}>
                Budget liefern
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditingHeader((v) => !v)}>
              Budget-Einstellungen
            </Button>
          </div>
        )}
      </div>

      {editingHeader && (
        <div className="mb-6 rounded-lg border p-4">
          <div className="mb-3 flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <Label>Startdatum</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Enddatum</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="mb-3 flex flex-col gap-2">
            <Label>Farbe</Label>
            <div className="flex gap-2">
              {PROJECT_COLOR_PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Farbe ${swatch}`}
                  className={cn("size-6 rounded-full", color === swatch ? "ring-2 ring-foreground ring-offset-1" : "")}
                  style={{ background: swatch }}
                />
              ))}
            </div>
          </div>
          <label className="mb-3 flex items-center gap-2 text-sm">
            <Checkbox checked={isTemplate} onCheckedChange={(c) => setIsTemplate(c === true)} />
            Als Vorlage speichern (für neue Budgets in diesem Projekt auswählbar)
          </label>
          <Button size="sm" onClick={handleSaveHeader}>
            Speichern
          </Button>
        </div>
      )}

      <CustomFieldsPanel budgetId={budget.id} customFieldDefs={customFieldDefs} customFieldValues={customFieldValues} users={users} canManage={canManage} onSaved={onSaved} />

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
        <TabsList className="mb-5 border-b">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios{scenarios.length > 0 ? ` (${scenarios.length})` : ""}</TabsTrigger>
          <TabsTrigger value="feed">Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <ServicesTab budgetId={budget.id} canManage={canManage} sections={sections} users={users} serviceTypes={serviceTypes} rateCardItems={rateCardItems} onSaved={onSaved} />
        </TabsContent>
        <TabsContent value="time">
          <TimeTab entries={timeEntries} />
        </TabsContent>
        <TabsContent value="invoices">
          <div className="flex flex-col gap-6">
            {retainerBurnTab}
            {invoicesTab}
          </div>
        </TabsContent>
        <TabsContent value="scenarios">
          <ScenariosTab projectId={projectId} budgetId={budget.id} canManage={canManage} scenarios={scenarios} onCreated={onSaved} />
        </TabsContent>
        <TabsContent value="feed">
          <FeedTab events={feedEvents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
