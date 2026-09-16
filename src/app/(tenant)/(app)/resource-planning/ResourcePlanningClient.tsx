"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { computeDailyCapacity } from "@/tenant/resourcePlanning/capacity";

import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Progress } from "@/ui/shadcn/components/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { ToggleGroup, ToggleGroupItem } from "@/ui/shadcn/components/toggle-group";
import { cn } from "@/ui/shadcn/lib/utils";

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
  effectiveWeeklyCapacityHours: number;
  plannedHours: number;
  utilizationPercent: number;
  tasks: Task[];
}

interface BookingPerson {
  id: string;
  email: string;
  name: string | null;
  weeklyCapacityHours: number;
}

interface BudgetSectionOption {
  id: string;
  name: string;
}

interface BookingProject {
  id: string;
  name: string;
  budgetSections: BudgetSectionOption[];
}

interface Booking {
  id: string;
  userId: string | null;
  placeholderName: string | null;
  userName: string;
  projectId: string;
  projectName: string;
  budgetSectionId: string | null;
  budgetSectionName: string | null;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  isTentative: boolean;
}

export function ResourcePlanningClient({
  canEdit,
  locale,
  weekStart,
  weekEnd,
  people,
  bookingPeople,
  bookingProjects,
  initialBookings,
}: {
  canEdit: boolean;
  locale?: "de" | "en" | null;
  weekStart: string;
  weekEnd: string;
  people: Person[];
  bookingPeople: BookingPerson[];
  bookingProjects: BookingProject[];
  initialBookings: Booking[];
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

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

  const weekDays = useMemo(() => {
    const start = new Date(weekStart);
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + index);
      return d;
    });
  }, [weekStart]);

  const bookingRows = useMemo(() => {
    const placeholderIds = new Set<string>();
    const placeholderRows: { id: string; label: string; isPlaceholder: true; weeklyCapacityHours: number }[] = [];
    for (const booking of initialBookings) {
      if (!booking.userId && booking.placeholderName) {
        const key = `placeholder:${booking.placeholderName}`;
        if (!placeholderIds.has(key)) {
          placeholderIds.add(key);
          placeholderRows.push({ id: key, label: booking.placeholderName, isPlaceholder: true, weeklyCapacityHours: 0 });
        }
      }
    }
    const peopleRows = bookingPeople.map((person) => ({
      id: person.id,
      label: person.name ?? person.email,
      isPlaceholder: false as const,
      weeklyCapacityHours: person.weeklyCapacityHours,
    }));
    return [...peopleRows, ...placeholderRows];
  }, [bookingPeople, initialBookings]);

  function dailyEntriesForRow(row: (typeof bookingRows)[number]) {
    if (row.isPlaceholder) {
      const placeholderName = row.label;
      return weekDays.map((day) => {
        const bookedHours = initialBookings
          .filter((b) => b.placeholderName === placeholderName && !b.userId)
          .filter((b) => {
            const dayStart = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
            const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
            return new Date(b.startDate).getTime() <= dayEnd && new Date(b.endDate).getTime() >= dayStart;
          })
          .reduce((sum, b) => sum + b.hoursPerDay, 0);
        const tentative = initialBookings.some((b) => b.placeholderName === placeholderName && !b.userId && b.isTentative);
        return { date: day, bookedHours, capacityHours: 0, isOver: false, isTentative: tentative };
      });
    }
    const daily = computeDailyCapacity(
      initialBookings.map((b) => ({
        userId: b.userId,
        startDate: new Date(b.startDate),
        endDate: new Date(b.endDate),
        hoursPerDay: b.hoursPerDay,
        isTentative: b.isTentative,
      })),
      row.id,
      row.weeklyCapacityHours,
      weekDays,
    );
    return daily.map((entry) => ({
      ...entry,
      isTentative: entry.tentativeHours > 0 && entry.confirmedHours === 0,
    }));
  }

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [personMode, setPersonMode] = useState<"user" | "placeholder">("user");
  const [formUserId, setFormUserId] = useState(bookingPeople[0]?.id ?? "");
  const [formPlaceholderName, setFormPlaceholderName] = useState("");
  const [formProjectId, setFormProjectId] = useState(bookingProjects[0]?.id ?? "");
  const [formBudgetSectionId, setFormBudgetSectionId] = useState("__none__");
  const [formStartDate, setFormStartDate] = useState(weekStart.slice(0, 10));
  const [formEndDate, setFormEndDate] = useState(weekStart.slice(0, 10));
  const [formHoursPerDay, setFormHoursPerDay] = useState("8");
  const [formTentative, setFormTentative] = useState(false);

  const selectedProject = bookingProjects.find((p) => p.id === formProjectId);

  async function handleCreateBooking() {
    setFormError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/resource-bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: personMode === "user" ? formUserId : undefined,
        placeholderName: personMode === "placeholder" ? formPlaceholderName : undefined,
        projectId: formProjectId,
        budgetSectionId: formBudgetSectionId === "__none__" ? undefined : formBudgetSectionId,
        startDate: new Date(`${formStartDate}T00:00:00.000Z`).toISOString(),
        endDate: new Date(`${formEndDate}T23:59:59.999Z`).toISOString(),
        hoursPerDay: Number(formHoursPerDay),
        isTentative: formTentative,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setFormError(body.error ?? "Buchung konnte nicht gespeichert werden.");
      return;
    }
    setShowForm(false);
    setFormPlaceholderName("");
    router.refresh();
  }

  async function handleDeleteBooking(id: string) {
    await fetch(`/api/tenant/resource-bookings/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="pb-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">{locale === "en" ? "Resourcing" : "Ressourcen"}</h1>
      <p className="mb-6 font-mono text-sm text-muted-foreground">
        Woche {formatDate(weekStart)} – {formatDate(weekEnd)}
      </p>

      <div className="mb-8 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead className="text-right">Geplant</TableHead>
              <TableHead className="text-right">Kapazität</TableHead>
              <TableHead className="text-right">Auslastung</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => (
              <Fragment key={person.id}>
                <TableRow>
                  <TableCell>{person.name ?? person.email}</TableCell>
                  <TableCell className="text-right">{person.plannedHours}h</TableCell>
                  <TableCell className="text-right">
                    {editingId === person.id ? (
                      <span className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          value={capacityInput}
                          onChange={(event) => setCapacityInput(event.target.value)}
                          className="h-8 w-20"
                        />
                        <Button size="sm" onClick={() => handleSaveCapacity(person.id)}>
                          Speichern
                        </Button>
                      </span>
                    ) : (
                      <span className="flex items-center justify-end gap-2">
                        <span className="text-muted-foreground">
                          {person.effectiveWeeklyCapacityHours !== person.weeklyCapacityHours
                            ? `${person.effectiveWeeklyCapacityHours.toFixed(1)}h (Feiertage)`
                            : `${person.weeklyCapacityHours}h`}
                        </span>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(person.id);
                              setCapacityInput(person.weeklyCapacityHours.toString());
                            }}
                          >
                            Bearbeiten
                          </Button>
                        )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Progress
                        value={Math.min(person.utilizationPercent, 100)}
                        variant={person.utilizationPercent > 100 ? "destructive" : "success"}
                        className="h-1.5 w-16"
                      />
                      <span className="w-10 text-right font-mono text-xs tabular-nums">{person.utilizationPercent.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === person.id ? null : person.id)}>
                      {expanded === person.id ? "Weniger" : `${person.tasks.length} Tasks`}
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded === person.id && (
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={5}>
                      {person.tasks.length === 0 ? (
                        <p className="py-2 text-sm text-muted-foreground">Keine Tasks diese Woche fällig.</p>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {person.tasks.map((task) => (
                            <li key={task.id} className="flex items-center justify-between text-sm">
                              <span>
                                {task.title} <span className="text-muted-foreground">({task.projectName})</span>
                              </span>
                              <span className="text-xs text-muted-foreground">{task.estimatedHours ?? "—"}h</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Buchungs-Grid</h2>
        {canEdit && (
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Abbrechen" : (
              <>
                <Plus className="size-4" />
                Buchung
              </>
            )}
          </Button>
        )}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Echte Ressourcen-Buchungen je Person/Platzhalter und Tag — unabhängig von zugewiesenen Tasks. Rot = bestätigte Buchungen
        über der Tageskapazität, gestrichelt = unverbindlich (tentativ).
      </p>

      {showForm && canEdit && (
        <div className="mb-4 rounded-lg border p-4">
          <ToggleGroup type="single" variant="outline" value={personMode} onValueChange={(value) => value && setPersonMode(value as "user" | "placeholder")} className="mb-3">
            <ToggleGroupItem value="user">Person</ToggleGroupItem>
            <ToggleGroupItem value="placeholder">Platzhalter (offene Rolle)</ToggleGroupItem>
          </ToggleGroup>

          {personMode === "user" ? (
            <div className="mb-3 flex flex-col gap-2">
              <Label htmlFor="booking-user">Person</Label>
              <Select value={formUserId} onValueChange={setFormUserId}>
                <SelectTrigger id="booking-user" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bookingPeople.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name ?? p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="mb-3 flex flex-col gap-2">
              <Label htmlFor="booking-placeholder">Rollenbezeichnung</Label>
              <Input id="booking-placeholder" placeholder="z. B. Frontend Dev (offen)" value={formPlaceholderName} onChange={(e) => setFormPlaceholderName(e.target.value)} />
            </div>
          )}

          <div className="mb-3 flex flex-col gap-2">
            <Label htmlFor="booking-project">Projekt</Label>
            <Select
              value={formProjectId}
              onValueChange={(value) => {
                setFormProjectId(value);
                setFormBudgetSectionId("__none__");
              }}
            >
              <SelectTrigger id="booking-project" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {bookingProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-3 flex flex-col gap-2">
            <Label htmlFor="booking-section">Budget-Abschnitt (optional)</Label>
            <Select value={formBudgetSectionId} onValueChange={setFormBudgetSectionId}>
              <SelectTrigger id="booking-section" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {(selectedProject?.budgetSections ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="booking-start">Von</Label>
              <Input id="booking-start" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="booking-end">Bis</Label>
              <Input id="booking-end" type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="booking-hours">Std./Tag</Label>
              <Input id="booking-hours" type="number" step="0.5" min="0" value={formHoursPerDay} onChange={(e) => setFormHoursPerDay(e.target.value)} />
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <Checkbox checked={formTentative} onCheckedChange={(checked) => setFormTentative(checked === true)} />
            Unverbindlich (tentativ)
          </label>

          {formError && <p className="mt-2 text-sm text-destructive">{formError}</p>}

          <Button size="sm" disabled={saving} onClick={handleCreateBooking} className="mt-3">
            Speichern
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person / Platzhalter</TableHead>
              {weekDays.map((day) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <TableHead
                    key={day.toISOString()}
                    className={cn("text-center", isToday && "bg-primary/10 text-primary")}
                  >
                    {day.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookingRows.map((row) => {
              const entries = dailyEntriesForRow(row);
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.label}
                    {row.isPlaceholder && <span className="text-muted-foreground"> (offen)</span>}
                  </TableCell>
                  {entries.map((entry) => {
                    const isToday = entry.date.toDateString() === new Date().toDateString();
                    return (
                      <TableCell key={entry.date.toISOString()} className={cn("text-center", isToday && "bg-primary/5")}>
                        {entry.bookedHours > 0 ? (
                          // Reference §05: the row bar's RAG color encodes day-level over-/under-booking.
                          <span
                            className={cn(
                              "inline-flex min-w-12 items-center justify-center rounded-full border px-2 py-0.5 font-mono text-xs tabular-nums",
                              entry.isTentative && "border-dashed",
                              entry.isOver
                                ? "border-destructive/30 bg-destructive/10 text-destructive"
                                : "border-success/30 bg-success/10 text-success",
                            )}
                          >
                            {entry.bookedHours}h
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            {bookingRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="p-3 text-sm text-muted-foreground">
                  Keine Personen vorhanden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {initialBookings.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1">
          {initialBookings.map((booking) => (
            <li key={booking.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
              <span>
                {booking.userName} · {booking.projectName}
                {booking.budgetSectionName ? ` · ${booking.budgetSectionName}` : ""}{" "}
                <span className="text-muted-foreground">
                  ({formatDate(booking.startDate)} – {formatDate(booking.endDate)}, {booking.hoursPerDay}h/Tag
                  {booking.isTentative ? ", tentativ" : ""})
                </span>
              </span>
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={() => handleDeleteBooking(booking.id)}>
                  Entfernen
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
