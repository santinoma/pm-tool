"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

// Kuratierte Auswahl statt der vollständigen IANA-Liste — gleiches Muster wie
// CURRENCIES oben. Kann bei Bedarf erweitert werden.
const TIME_ZONES = [
  "Europe/Berlin",
  "Europe/London",
  "Europe/Zurich",
  "Europe/Vienna",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "UTC",
];

const WEEKDAYS = [
  { value: 1, label: "Montag" },
  { value: 2, label: "Dienstag" },
  { value: 3, label: "Mittwoch" },
  { value: 4, label: "Donnerstag" },
  { value: 5, label: "Freitag" },
  { value: 6, label: "Samstag" },
  { value: 0, label: "Sonntag" },
];

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function OrganizationSettingsClient({
  currency,
  triageEnabled,
  require2fa,
  scimBearerToken,
  timeZone,
  timeFormat,
  dateFormat,
  numberFormat,
  weekStartDay,
  workingDays,
  personDayHours,
  fiscalYearEnabled,
  fiscalYearStartMonth,
}: {
  currency: string;
  triageEnabled: boolean;
  require2fa: boolean;
  scimBearerToken: string | null;
  timeZone: string;
  timeFormat: "h12" | "h24";
  dateFormat: "dd_mm_yyyy" | "mm_dd_yyyy" | "yyyy_mm_dd";
  numberFormat: "comma_decimal" | "period_decimal";
  weekStartDay: number;
  workingDays: number[];
  personDayHours: number;
  fiscalYearEnabled: boolean;
  fiscalYearStartMonth: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currency);
  const [triage, setTriage] = useState(triageEnabled);
  const [twoFa, setTwoFa] = useState(require2fa);
  const [token, setToken] = useState(scimBearerToken);
  const [saving, setSaving] = useState(false);

  const [tz, setTz] = useState(timeZone);
  const [tFormat, setTFormat] = useState(timeFormat);
  const [dFormat, setDFormat] = useState(dateFormat);
  const [nFormat, setNFormat] = useState(numberFormat);

  const [weekStart, setWeekStart] = useState(weekStartDay);
  const [days, setDays] = useState<number[]>(workingDays);
  const [dayHours, setDayHours] = useState(String(personDayHours));

  const [fiscalEnabled, setFiscalEnabled] = useState(fiscalYearEnabled);
  const [fiscalMonth, setFiscalMonth] = useState(fiscalYearStartMonth);

  async function patchSettings(data: Record<string, unknown>) {
    setSaving(true);
    await fetch("/api/tenant/tenant-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleCurrencyChange(nextValue: string) {
    setValue(nextValue);
    await patchSettings({ currency: nextValue });
  }

  async function handleTriageChange(nextChecked: boolean) {
    setTriage(nextChecked);
    await patchSettings({ triageEnabled: nextChecked });
  }

  async function handleTwoFaChange(nextChecked: boolean) {
    setTwoFa(nextChecked);
    await patchSettings({ require2fa: nextChecked });
  }

  async function handleTimeZoneChange(nextValue: string) {
    setTz(nextValue);
    await patchSettings({ timeZone: nextValue });
  }

  async function handleTimeFormatChange(nextValue: "h12" | "h24") {
    setTFormat(nextValue);
    await patchSettings({ timeFormat: nextValue });
  }

  async function handleDateFormatChange(nextValue: "dd_mm_yyyy" | "mm_dd_yyyy" | "yyyy_mm_dd") {
    setDFormat(nextValue);
    await patchSettings({ dateFormat: nextValue });
  }

  async function handleNumberFormatChange(nextValue: "comma_decimal" | "period_decimal") {
    setNFormat(nextValue);
    await patchSettings({ numberFormat: nextValue });
  }

  async function handleWeekStartChange(nextValue: string) {
    const next = Number(nextValue);
    setWeekStart(next);
    await patchSettings({ weekStartDay: next });
  }

  async function handleWorkingDayToggle(day: number) {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    setDays(next);
    await patchSettings({ workingDays: next });
  }

  async function handleDayHoursBlur() {
    const parsed = Number(dayHours);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDayHours(String(personDayHours));
      return;
    }
    await patchSettings({ personDayHours: parsed });
  }

  async function handleFiscalEnabledChange(nextChecked: boolean) {
    setFiscalEnabled(nextChecked);
    await patchSettings({ fiscalYearEnabled: nextChecked });
  }

  async function handleFiscalMonthChange(nextValue: string) {
    const next = Number(nextValue);
    setFiscalMonth(next);
    await patchSettings({ fiscalYearStartMonth: next });
  }

  async function handleGenerateScimToken() {
    setSaving(true);
    const response = await fetch("/api/tenant/organization/scim-token", { method: "POST" });
    setSaving(false);
    if (response.ok) {
      const data = await response.json();
      setToken(data.scimBearerToken);
    }
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Organisation</h1>

      <div className="mb-6 max-w-[200px]">
        <Label htmlFor="org-currency" className="mb-2 block">
          Währung
        </Label>
        <Select value={value} onValueChange={handleCurrencyChange}>
          <SelectTrigger id="org-currency" disabled={saving} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Label className="mb-8 flex items-center gap-3 font-normal">
        <Checkbox checked={triage} disabled={saving} onCheckedChange={(v) => handleTriageChange(v === true)} />
        Neue Tasks zuerst in die Triage stellen, statt sie direkt ins Projekt zu übernehmen
      </Label>

      <h2 className="mb-3 text-lg font-semibold">Standort &amp; Format</h2>
      <div className="mb-8 flex flex-wrap gap-4">
        <div className="w-56">
          <Label htmlFor="org-timezone" className="mb-2 block">
            Zeitzone
          </Label>
          <Select value={tz} onValueChange={handleTimeZoneChange}>
            <SelectTrigger id="org-timezone" disabled={saving} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_ZONES.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label htmlFor="org-timeformat" className="mb-2 block">
            Zeitformat
          </Label>
          <Select value={tFormat} onValueChange={(v) => handleTimeFormatChange(v as "h12" | "h24")}>
            <SelectTrigger id="org-timeformat" disabled={saving} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="h24">24-Stunden (14:00)</SelectItem>
              <SelectItem value="h12">12-Stunden (2:00 PM)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Label htmlFor="org-dateformat" className="mb-2 block">
            Datumsformat
          </Label>
          <Select value={dFormat} onValueChange={(v) => handleDateFormatChange(v as typeof dFormat)}>
            <SelectTrigger id="org-dateformat" disabled={saving} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dd_mm_yyyy">TT.MM.JJJJ</SelectItem>
              <SelectItem value="mm_dd_yyyy">MM/TT/JJJJ</SelectItem>
              <SelectItem value="yyyy_mm_dd">JJJJ-MM-TT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Label htmlFor="org-numberformat" className="mb-2 block">
            Zahlenformat
          </Label>
          <Select value={nFormat} onValueChange={(v) => handleNumberFormatChange(v as typeof nFormat)}>
            <SelectTrigger id="org-numberformat" disabled={saving} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comma_decimal">1.234,56 (Komma als Dezimaltrennzeichen)</SelectItem>
              <SelectItem value="period_decimal">1,234.56 (Punkt als Dezimaltrennzeichen)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Arbeitszeit</h2>
      <div className="mb-8 flex flex-wrap items-end gap-4">
        <div className="w-48">
          <Label htmlFor="org-weekstart" className="mb-2 block">
            Wochenbeginn
          </Label>
          <Select value={String(weekStart)} onValueChange={handleWeekStartChange}>
            <SelectTrigger id="org-weekstart" disabled={saving} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map((day) => (
                <SelectItem key={day.value} value={String(day.value)}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label htmlFor="org-dayhours" className="mb-2 block">
            Stunden pro Arbeitstag
          </Label>
          <Input
            id="org-dayhours"
            type="number"
            min={0.5}
            step={0.5}
            disabled={saving}
            value={dayHours}
            onChange={(event) => setDayHours(event.target.value)}
            onBlur={handleDayHoursBlur}
          />
        </div>
      </div>
      <div className="mb-8">
        <Label className="mb-2 block">Arbeitstage</Label>
        <div className="flex flex-wrap gap-4">
          {WEEKDAYS.map((day) => (
            <Label key={day.value} className="flex items-center gap-2 font-normal">
              <Checkbox
                checked={days.includes(day.value)}
                disabled={saving}
                onCheckedChange={() => handleWorkingDayToggle(day.value)}
              />
              {day.label}
            </Label>
          ))}
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Geschäftsjahr</h2>
      <Label className={fiscalEnabled ? "mb-3 flex items-center gap-3 font-normal" : "mb-8 flex items-center gap-3 font-normal"}>
        <Checkbox checked={fiscalEnabled} disabled={saving} onCheckedChange={(v) => handleFiscalEnabledChange(v === true)} />
        Abweichendes Geschäftsjahr aktivieren
      </Label>
      {fiscalEnabled && (
        <div className="mb-8 w-56">
          <Label htmlFor="org-fiscalmonth" className="mb-2 block">
            Beginn des Geschäftsjahres
          </Label>
          <Select value={String(fiscalMonth)} onValueChange={handleFiscalMonthChange}>
            <SelectTrigger id="org-fiscalmonth" disabled={saving} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem key={month} value={String(index + 1)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Sicherheit</h2>
      <Label className="mb-8 flex items-center gap-3 font-normal">
        <Checkbox checked={twoFa} disabled={saving} onCheckedChange={(v) => handleTwoFaChange(v === true)} />
        Zwei-Faktor-Authentifizierung für alle Mitglieder erzwingen
      </Label>

      <h2 className="mb-3 text-lg font-semibold">SCIM-Provisionierung</h2>
      {token ? (
        <Card className="mb-4">
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">Bearer-Token für euren Identity Provider:</p>
            <code className="font-mono text-sm break-all">{token}</code>
          </CardContent>
        </Card>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">Noch kein SCIM-Token erzeugt.</p>
      )}
      <Button type="button" variant="outline" onClick={handleGenerateScimToken} disabled={saving}>
        {token ? "Token neu generieren" : "Token generieren"}
      </Button>
    </div>
  );
}
