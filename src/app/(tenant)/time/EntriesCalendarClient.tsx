"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
    if ((event.target as HTMLElement).closest(".time-block")) return;
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
    const column = (event.currentTarget as HTMLElement).closest(".day-column") as HTMLElement | null;
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
          const { startMinutes, endMinutes } = moveBlock(
            current.initialStartMinutes,
            current.initialEndMinutes,
            deltaMinutes,
          );
          return { ...current, deltaMinutes, liveStartMinutes: startMinutes, liveEndMinutes: endMinutes };
        }
        const edge = current.kind === "resize-start" ? "start" : "end";
        const newEdgeMinutes =
          edge === "start" ? current.initialStartMinutes + deltaMinutes : current.initialEndMinutes + deltaMinutes;
        const { startMinutes, endMinutes } = resizeBlock(
          current.initialStartMinutes,
          current.initialEndMinutes,
          edge,
          newEdgeMinutes,
        );
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
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <h1>Meine Zeit</h1>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <button type="button" onClick={goToPreviousWeek} className="btn btn-secondary btn-sm">
            ← Vorherige Woche
          </button>
          <button type="button" onClick={goToNextWeek} className="btn btn-secondary btn-sm">
            Nächste Woche →
          </button>
        </div>
      </div>

      <div className="day-calendar">
        <div className="day-calendar-header">
          <div className="day-calendar-gutter-spacer" />
          {days.map((day, index) => {
            const dateValue = toDateInputValue(day);
            return (
              <div key={dateValue} className={`day-calendar-day-header${dateValue === today ? " is-today" : ""}`}>
                {DAY_LABELS[index]} {day.getDate()}.{day.getMonth() + 1}.
              </div>
            );
          })}
        </div>

        <div className="day-calendar-scroll" ref={scrollRef}>
          <div className="day-calendar-body" style={{ height: minutesToTopPx(24 * 60) }}>
            <div className="day-calendar-gutter">
              {HOURS.map((hour) => (
                <div key={hour} className="day-calendar-hour-label" style={{ top: minutesToTopPx(hour * 60) }}>
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
                  className={`day-column${dateValue === today ? " is-today" : ""}`}
                  onMouseDown={(event) => handleColumnMouseDown(event, dayIndex)}
                >
                  {HOURS.map((hour) => (
                    <div key={hour} className="day-calendar-hour-line" style={{ top: minutesToTopPx(hour * 60) }} />
                  ))}

                  {dayEntries.map((entry) => {
                    const isDraggingThis = drag && drag.kind !== "create" && drag.entryId === entry.id;
                    const startMinutes = isDraggingThis
                      ? drag.liveStartMinutes
                      : minutesSinceMidnight(new Date(entry.startedAt));
                    const endMinutes = isDraggingThis
                      ? drag.liveEndMinutes
                      : minutesSinceMidnight(new Date(entry.endedAt));
                    return (
                      <div
                        key={entry.id}
                        className={`time-block${isDraggingThis ? " is-dragging" : ""}`}
                        style={{
                          top: minutesToTopPx(startMinutes),
                          height: minutesToHeightPx(endMinutes - startMinutes),
                        }}
                        onMouseDown={(event) => handleBlockMouseDown(event, entry, dayIndex, "move")}
                        title={entry.description ?? entry.serviceLabel}
                      >
                        <div
                          className="time-block-handle time-block-handle-top"
                          onMouseDown={(event) => handleBlockMouseDown(event, entry, dayIndex, "resize-start")}
                        />
                        <span className="time-block-time">
                          {formatMinutesAsTime(startMinutes)}–{formatMinutesAsTime(endMinutes)}
                        </span>
                        <span className="time-block-label">{entry.serviceLabel}</span>
                        <div
                          className="time-block-handle time-block-handle-bottom"
                          onMouseDown={(event) => handleBlockMouseDown(event, entry, dayIndex, "resize-end")}
                        />
                      </div>
                    );
                  })}

                  {drag && drag.kind === "create" && drag.dayIndex === dayIndex && (
                    <div
                      className="time-block time-block-preview"
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
        <NewTimeEntryModal
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

function NewTimeEntryModal({
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
  const [budgetSectionId, setBudgetSectionId] = useState(services[0]?.id ?? "");
  const [startTime, setStartTime] = useState(formatMinutesAsTime(startMinutes));
  const [endTime, setEndTime] = useState(formatMinutesAsTime(endMinutes));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    if (!budgetSectionId) {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <h2>New time entry</h2>

        <div className="modal-field">
          <label htmlFor="entry-date">Datum</label>
          <input
            id="entry-date"
            type="date"
            className="input"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
          />
        </div>

        <div className="modal-field">
          <label htmlFor="entry-service">Service</label>
          <select
            id="entry-service"
            className="select"
            value={budgetSectionId}
            onChange={(event) => setBudgetSectionId(event.target.value)}
          >
            {services.length === 0 && <option value="">Keine Services zugeordnet</option>}
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.label}
              </option>
            ))}
          </select>
        </div>

        <div className="row" style={{ gap: "var(--space-3)" }}>
          <div className="modal-field" style={{ flex: 1 }}>
            <label htmlFor="entry-start">Von</label>
            <input
              id="entry-start"
              type="time"
              step={900}
              className="input"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>
          <div className="modal-field" style={{ flex: 1 }}>
            <label htmlFor="entry-end">Bis</label>
            <input
              id="entry-end"
              type="time"
              step={900}
              className="input"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </div>
        </div>

        <div className="modal-field">
          <label htmlFor="entry-note">Note</label>
          <textarea
            id="entry-note"
            className="input"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {error && <p className="field-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
            Abbrechen
          </button>
          <button type="button" onClick={handleSave} className="btn btn-primary" disabled={saving}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
