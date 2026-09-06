"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

interface HolidayRow {
  id: string;
  date: string;
  name: string;
}

interface HolidayCalendarRow {
  id: string;
  name: string;
  country: string | null;
  holidays: HolidayRow[];
}

export function HolidayCalendarsClient({ holidayCalendars }: { holidayCalendars: HolidayCalendarRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(holidayCalendars[0]?.id ?? null);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [savingHoliday, setSavingHoliday] = useState(false);

  const selectedCalendar = holidayCalendars.find((calendar) => calendar.id === selectedCalendarId) ?? null;

  async function handleCreateCalendar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/holiday-calendars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, country: country.trim() || undefined }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Kalender konnte nicht angelegt werden.");
      return;
    }
    const data = await response.json();
    setName("");
    setCountry("");
    setSelectedCalendarId(data.holidayCalendar?.id ?? null);
    router.refresh();
  }

  async function handleAddHoliday(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHolidayError(null);
    if (!selectedCalendarId) return;
    setSavingHoliday(true);
    const response = await fetch(`/api/tenant/holiday-calendars/${selectedCalendarId}/holidays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: holidayDate, name: holidayName }),
    });
    setSavingHoliday(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setHolidayError(body.error ?? "Feiertag konnte nicht angelegt werden.");
      return;
    }
    setHolidayDate("");
    setHolidayName("");
    router.refresh();
  }

  async function handleDeleteHoliday(holidayId: string) {
    await fetch(`/api/tenant/holidays/${holidayId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Feiertagskalender</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Lege benannte Feiertagskalender (z. B. „Deutschland“, „USA“) mit einzelnen Feiertagen an. Weise sie
        Mitgliedern auf der Mitglieder-Seite zu — verfügbare Kapazität wird an diesen Tagen automatisch reduziert.
      </p>

      {holidayCalendars.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Noch keine Feiertagskalender.</p>
      ) : (
        <ul className="mb-10 overflow-hidden rounded-lg border">
          {holidayCalendars.map((calendar) => (
            <li key={calendar.id} className="border-b last:border-0">
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setSelectedCalendarId(calendar.id);
                }}
                className={cn(
                  "block px-4 py-3 text-sm font-semibold hover:bg-muted/40",
                  selectedCalendarId === calendar.id && "bg-muted/40",
                )}
              >
                {calendar.name}
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {calendar.country ? `${calendar.country} · ` : ""}
                  {calendar.holidays.length} Feiertag(e)
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-4 text-lg font-semibold">Neuer Kalender</h2>
      <form onSubmit={handleCreateCalendar} className="mb-3 flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="calendar-name" className="mb-2 block">
            Name
          </Label>
          <Input
            id="calendar-name"
            placeholder="z. B. Deutschland"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="w-48"
          />
        </div>
        <div>
          <Label htmlFor="calendar-country" className="mb-2 block">
            Land (optional)
          </Label>
          <Input
            id="calendar-country"
            placeholder="z. B. DE"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="w-28"
          />
        </div>
        <Button type="submit" disabled={saving}>
          Anlegen
        </Button>
      </form>
      {error && <p className="mb-6 text-sm text-destructive">{error}</p>}

      {selectedCalendar && (
        <>
          <h2 className="mt-8 mb-4 text-lg font-semibold">Feiertage — {selectedCalendar.name}</h2>

          {selectedCalendar.holidays.length === 0 ? (
            <p className="mb-6 text-sm text-muted-foreground">Noch keine Feiertage in diesem Kalender.</p>
          ) : (
            <div className="mb-6 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCalendar.holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-mono">{holiday.date.slice(0, 10)}</TableCell>
                      <TableCell>{holiday.name}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteHoliday(holiday.id)}>
                          Löschen
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <form onSubmit={handleAddHoliday} className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="holiday-date" className="mb-2 block">
                Datum
              </Label>
              <Input
                id="holiday-date"
                type="date"
                value={holidayDate}
                onChange={(event) => setHolidayDate(event.target.value)}
                required
                className="w-40"
              />
            </div>
            <div>
              <Label htmlFor="holiday-name" className="mb-2 block">
                Name
              </Label>
              <Input
                id="holiday-name"
                placeholder="z. B. Tag der Arbeit"
                value={holidayName}
                onChange={(event) => setHolidayName(event.target.value)}
                required
                className="w-56"
              />
            </div>
            <Button type="submit" disabled={savingHoliday}>
              Hinzufügen
            </Button>
          </form>
          {holidayError && <p className="mt-3 text-sm text-destructive">{holidayError}</p>}
        </>
      )}
    </div>
  );
}
