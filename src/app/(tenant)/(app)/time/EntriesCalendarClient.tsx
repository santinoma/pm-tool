"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatMinutesAsTime,
  minutesSinceMidnight,
  minutesToHeightPx,
  minutesToTopPx,
  moveBlock,
  pxToMinutes,
  resizeBlock,
  resolveDragRange,
} from "@/tenant/timeTracking/calendarGeometry";

import { Button } from "@/ui/shadcn/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/components/dialog";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Textarea } from "@/ui/shadcn/components/textarea";
import { cn } from "@/ui/shadcn/lib/utils";

interface ServiceOption {
  id: string;
  label: string;
}

interface EntryItem {
  id: string;
  budgetSectionId: string;
  serviceLabel: string;
  startedAt: string;
  endedAt: string;
  description: string | null;
}

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const VISIBLE_START_HOUR = 6;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function combineDateAndMinutes(dateValue: string, minutes: number): Date {
  const result = new Date(`${dateValue}T00:00:00`);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

type DragState =
  | { kind: "create"; dayIndex: number; columnTop: number; startMinutes: number; currentMinutes: number }
  | {
      kind: "move" | "resize-start" | "resize-end";
      entryId: string;
      dayIndex: number;
      columnTop: number;
      initialStartMinutes: number;
      initialEndMinutes: number;
      initialMouseY: number;
      deltaMinutes: number;
      liveStartMinutes: number;
      liveEndMinutes: number;
    };

export function EntriesCalendarClient({
  services,
  entries,
}: {
  services: ServiceOption[];
  entries: EntryItem[];
}) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [modalPrefill, setModalPrefill] = useState<{ date: string; startMinutes: number; endMinutes: number } | null>(
    null,
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = minutesToTopPx(VISIBLE_START_HOUR * 60);
    }
  }, []);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + index);
        return date;
      }),
    [weekStart],
  );

  const entriesByDayIndex = useMemo(() => {
    const map = new Map<number, EntryItem[]>();
    for (const entry of entries) {
      const entryDate = new Date(entry.startedAt);
      const dayIndex = days.findIndex((day) => toDateInputValue(day) === toDateInputValue(entryDate));
      if (dayIndex === -1) continue;
      const list = map.get(dayIndex) ?? [];
      list.push(entry);
      map.set(dayIndex, list);
    }
    return map;
  }, [entries, days]);

  const today = toDateInputValue(new Date());

  function goToPreviousWeek() {
    const next = new Date(weekStart);
    next.setDate(next.getDate() - 7);
    setWeekStart(next);
  }

  function goToNextWeek() {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  }

  function handleColumnMouseDown(event: React.MouseEvent<HTMLDivElement>, dayIndex: number) {
    if ((event.target as HTMLElement).closest("[data-time-block]")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const startMinutes = pxToMinutes(event.clientY - rect.top);
    setDrag({ kind: "create", dayIndex, columnTop: rect.top, startMinutes, currentMinutes: startMinutes });
  }

  function handleBlockMouseDown(
    event: React.MouseEvent<HTMLDivElement>,
    entry: EntryItem,
    dayIndex: number,
    mode: "move" | "resize-start" | "resize-end",
  ) {
    event.stopPropagation();
    const column = (event.currentTarget as HTMLElement).closest("[data-day-column]") as HTMLElement | null;
    const rect = column?.getBoundingClientRect();
    const startMinutes = minutesSinceMidnight(new Date(entry.startedAt));
    const endMinutes = minutesSinceMidnight(new Date(entry.endedAt));
    setDrag({
      kind: mode,
      entryId: entry.id,
      dayIndex,
      columnTop: rect?.top ?? 0,
      initialStartMinutes: startMinutes,
      initialEndMinutes: endMinutes,
      initialMouseY: event.clientY,
      deltaMinutes: 0,
      liveStartMinutes: startMinutes,
      liveEndMinutes: endMinutes,
    });
  }

  useEffect(() => {
    if (!drag) return;

    function handleMouseMove(event: MouseEvent) {
      setDrag((current) => {
        if (!current) return current;
        if (current.kind === "create") {
          const minutes = pxToMinutes(event.clientY - current.columnTop);
          return { ...current, currentMinutes: minutes };
        }
        const deltaMinutes = pxToMinutes(event.clientY - current.initialMouseY);
        if (current.kind === "move") {
          const { startMinutes, endMinutes } = moveBlock(current.initialStartMinutes, current.initialEndMinutes, deltaMinutes);
          return { ...current, deltaMinutes, liveStartMinutes: startMinutes, liveEndMinutes: endMinutes };
        }
        const edge = current.kind === "resize-start" ? "start" : "end";
        const newEdgeMinutes = edge === "start" ? current.initialStartMinutes + deltaMinutes : current.initialEndMinutes + deltaMinutes;
        const { startMinutes, endMinutes } = resizeBlock(current.initialStartMinutes, current.initialEndMinutes, edge, newEdgeMinutes);
        return { ...current, deltaMinutes, liveStartMinutes: startMinutes, liveEndMinutes: endMinutes };
      });
    }

    function handleMouseUp() {
      setDrag((current) => {
        if (!current) return null;
        if (current.kind === "create") {
          const { startMinutes, endMinutes } = resolveDragRange(current.startMinutes, current.currentMinutes);
          const dateValue = toDateInputValue(days[current.dayIndex]);
          setModalPrefill({ date: dateValue, startMinutes, endMinutes });
        } else {
          const dateValue = toDateInputValue(days[current.dayIndex]);
          fetch(`/api/tenant/time-entries/${current.entryId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              startedAt: combineDateAndMinutes(dateValue, current.liveStartMinutes).toISOString(),
              endedAt: combineDateAndMinutes(dateValue, current.liveEndMinutes).toISOString(),
            }),
          }).then(() => router.refresh());
        }
        return null;
      });
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drag !== null, days, router]);

  return (
    <div className="pb-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Meine Zeit</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
            <ChevronLeft className="size-4" />
            Vorherige Woche
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            Nächste Woche
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b">
          <div className="border-r" />
          {days.map((day, index) => {
            const dateValue = toDateInputValue(day);
            return (
              <div
                key={dateValue}
                className={cn(
                  "border-r px-3 py-2 text-center text-xs font-semibold tracking-wide uppercase last:border-r-0",
                  dateValue === today ? "text-primary" : "text-muted-foreground",
                )}
              >
                {DAY_LABELS[index]} {day.getDate()}.{day.getMonth() + 1}.
              </div>
            );
          })}
        </div>

        <div className="max-h-[576px] overflow-y-auto" ref={scrollRef}>
          <div className="relative grid grid-cols-[56px_repeat(7,1fr)] auto-rows-fr" style={{ height: minutesToTopPx(24 * 60) }}>
            <div className="relative border-r">
              {HOURS.map((hour) => (
                <div key={hour} className="absolute right-2 -translate-y-1/2 font-mono text-xs text-muted-foreground" style={{ top: minutesToTopPx(hour * 60) }}>
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {days.map((day, dayIndex) => {
              const dateValue = toDateInputValue(day);
              const dayEntries = entriesByDayIndex.get(dayIndex) ?? [];
              return (
                <div
                  key={dateValue}
                  data-day-column
                  className={cn("relative cursor-crosshair border-r last:border-r-0 select-none", dateValue === today && "bg-primary/5")}
                  onMouseDown={(event) => handleColumnMouseDown(event, dayIndex)}
                >
                  {HOURS.map((hour) => (
                    <div key={hour} className="absolute right-0 left-0 border-t" style={{ top: minutesToTopPx(hour * 60) }} />
                  ))}

                  {dayEntries.map((entry) => {
                    const isDraggingThis = drag && drag.kind !== "create" && drag.entryId === entry.id;
                    const startMinutes = isDraggingThis ? drag.liveStartMinutes : minutesSinceMidnight(new Date(entry.startedAt));
                    const endMinutes = isDraggingThis ? drag.liveEndMinutes : minutesSinceMidnight(new Date(entry.endedAt));
                    return (
                      <div
                        key={entry.id}
                        data-time-block
                        className={cn(
                          "absolute right-1 left-1 flex cursor-grab flex-col overflow-hidden rounded-md border border-primary bg-primary/15 px-2 py-0.5 text-primary",
                          isDraggingThis && "z-10 opacity-90 shadow-lg",
                        )}
                        style={{ top: minutesToTopPx(startMinutes), height: minutesToHeightPx(endMinutes - startMinutes) }}
                        onMouseDown={(event) => handleBlockMouseDown(event, entry, dayIndex, "move")}
                        title={entry.description ?? entry.serviceLabel}
                      >
                        <div className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize" onMouseDown={(event) => handleBlockMouseDown(event, entry, dayIndex, "resize-start")} />
                        <span className="font-mono text-xs">
                          {formatMinutesAsTime(startMinutes)}–{formatMinutesAsTime(endMinutes)}
                        </span>
                        <span className="truncate text-xs font-medium">{entry.serviceLabel}</span>
                        <div className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize" onMouseDown={(event) => handleBlockMouseDown(event, entry, dayIndex, "resize-end")} />
                      </div>
                    );
                  })}

                  {drag && drag.kind === "create" && drag.dayIndex === dayIndex && (
                    <div
                      className="pointer-events-none absolute right-1 left-1 rounded-md border border-dashed border-primary bg-primary/10"
                      style={{
                        top: minutesToTopPx(Math.min(drag.startMinutes, drag.currentMinutes)),
                        height: minutesToHeightPx(Math.abs(drag.currentMinutes - drag.startMinutes)),
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modalPrefill && (
        <NewTimeEntryDialog
          date={modalPrefill.date}
          startMinutes={modalPrefill.startMinutes}
          endMinutes={modalPrefill.endMinutes}
          services={services}
          onClose={() => setModalPrefill(null)}
          onSaved={() => {
            setModalPrefill(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function NewTimeEntryDialog({
  date,
  startMinutes,
  endMinutes,
  services,
  onClose,
  onSaved,
}: {
  date: string;
  startMinutes: number;
  endMinutes: number;
  services: ServiceOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [entryDate, setEntryDate] = useState(date);
  const [budgetSectionId, setBudgetSectionId] = useState(services[0]?.id ?? "__none__");
  const [startTime, setStartTime] = useState(formatMinutesAsTime(startMinutes));
  const [endTime, setEndTime] = useState(formatMinutesAsTime(endMinutes));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    if (budgetSectionId === "__none__") {
      setError("Bitte einen Service auswählen.");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/tenant/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budgetSectionId,
        startedAt: new Date(`${entryDate}T${startTime}:00`).toISOString(),
        endedAt: new Date(`${entryDate}T${endTime}:00`).toISOString(),
        description: note || null,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Eintrag konnte nicht gespeichert werden.");
      return;
    }
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New time entry</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="entry-date">Datum</Label>
          <Input id="entry-date" type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="entry-service">Service</Label>
          <Select value={budgetSectionId} onValueChange={setBudgetSectionId}>
            <SelectTrigger id="entry-service" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {services.length === 0 && <SelectItem value="__none__">Keine Services zugeordnet</SelectItem>}
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="entry-start">Von</Label>
            <Input id="entry-start" type="time" step={900} value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="entry-end">Bis</Label>
            <Input id="entry-end" type="time" step={900} value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="entry-note">Note</Label>
          <Textarea id="entry-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={saving}>
              Abbrechen
            </Button>
          </DialogClose>
          <Button onClick={handleSave} loading={saving}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
