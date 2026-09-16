"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";

interface TimeTrackingPolicyState {
  maxDailyHours: number | null;
  blockWeekends: boolean;
  blockOverlaps: boolean;
}

export function TimeTrackingSettingsClient({
  allowProjectLevelTimeEntries,
  timeTrackingMode,
  timeApprovalEnabled,
  timeEntrySubmissionEnabled,
  isPrivileged,
  policy,
}: {
  allowProjectLevelTimeEntries: boolean;
  timeTrackingMode: "timer" | "entries";
  timeApprovalEnabled: boolean;
  timeEntrySubmissionEnabled: boolean;
  isPrivileged: boolean;
  policy: TimeTrackingPolicyState | null;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(allowProjectLevelTimeEntries);
  const [mode, setMode] = useState(timeTrackingMode);
  const [approvalEnabled, setApprovalEnabled] = useState(timeApprovalEnabled);
  const [submissionEnabled, setSubmissionEnabled] = useState(timeEntrySubmissionEnabled);
  const [saving, setSaving] = useState(false);

  const [maxDailyHours, setMaxDailyHours] = useState(
    policy?.maxDailyHours !== null && policy?.maxDailyHours !== undefined ? String(policy.maxDailyHours) : "",
  );
  const [blockWeekends, setBlockWeekends] = useState(policy?.blockWeekends ?? false);
  const [blockOverlaps, setBlockOverlaps] = useState(policy?.blockOverlaps ?? false);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    await fetch("/api/tenant/tenant-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    router.refresh();
  }

  async function patchPolicy(body: Record<string, unknown>) {
    setPolicyError(null);
    setPolicySaving(true);
    const response = await fetch("/api/tenant/time-tracking-policy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setPolicySaving(false);
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setPolicyError(result?.error ?? "Policy konnte nicht gespeichert werden.");
      return;
    }
    router.refresh();
  }

  function handleMaxDailyHoursBlur() {
    const trimmed = maxDailyHours.trim();
    if (trimmed === "") {
      patchPolicy({ maxDailyHours: null });
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPolicyError("Bitte eine positive Zahl eingeben.");
      return;
    }
    patchPolicy({ maxDailyHours: parsed });
  }

  function handleBlockWeekendsChange(next: boolean) {
    setBlockWeekends(next);
    patchPolicy({ blockWeekends: next });
  }

  function handleBlockOverlapsChange(next: boolean) {
    setBlockOverlaps(next);
    patchPolicy({ blockOverlaps: next });
  }

  async function handleModeChange(nextMode: "timer" | "entries") {
    setMode(nextMode);
    await patch({ timeTrackingMode: nextMode });
  }

  async function handleAllowChange(nextChecked: boolean) {
    setChecked(nextChecked);
    await patch({ allowProjectLevelTimeEntries: nextChecked });
  }

  async function handleApprovalEnabledChange(nextChecked: boolean) {
    setApprovalEnabled(nextChecked);
    await patch({ timeApprovalEnabled: nextChecked });
  }

  async function handleSubmissionEnabledChange(nextChecked: boolean) {
    setSubmissionEnabled(nextChecked);
    await patch({ timeEntrySubmissionEnabled: nextChecked });
  }

  return (
    <div className="mx-auto max-w-xl pb-10">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Zeiterfassung – Einstellungen</h1>

      <fieldset className="mb-6 border-0 p-0">
        <legend className="mb-3 text-sm font-semibold">Art der Zeiterfassung</legend>
        <Label className="mb-2 flex items-center gap-3 font-normal">
          <input
            type="radio"
            name="timeTrackingMode"
            checked={mode === "timer"}
            disabled={saving}
            onChange={() => handleModeChange("timer")}
          />
          Zeituhr (starten &amp; stoppen)
        </Label>
        <Label className="flex items-center gap-3 font-normal">
          <input
            type="radio"
            name="timeTrackingMode"
            checked={mode === "entries"}
            disabled={saving}
            onChange={() => handleModeChange("entries")}
          />
          Zeiteintragungen (Kalender, mit Service &amp; Stundensatz für Budgets)
        </Label>
      </fieldset>

      <Label className="mb-6 flex items-center gap-3 font-normal">
        <Checkbox checked={checked} disabled={saving} onCheckedChange={(value) => handleAllowChange(value === true)} />
        Zeitbuchung auch direkt auf Projektebene erlauben (ohne konkreten Task)
      </Label>

      {isPrivileged && (
        <div className="mb-8">
          <Label className="mb-2 flex items-center gap-3 font-normal">
            <Checkbox checked={approvalEnabled} disabled={saving} onCheckedChange={(value) => handleApprovalEnabledChange(value === true)} />
            Time Approval aktivieren
          </Label>
          <p className="mb-4 text-sm text-muted-foreground">
            Wenn aktiviert, geht jeder erfasste Zeiteintrag automatisch in die Genehmigung (kein manuelles
            Einreichen nötig) — pro Budget lässt sich festlegen, wer genehmigen muss, bevor der Eintrag anerkannt
            und abrechenbar wird. Ist ein Budget ohne Policy, genehmigt jeder Owner/Admin. Ist Time Approval
            komplett deaktiviert, werden Einträge sofort automatisch genehmigt. Siehe{" "}
            <a href="/settings/organization/approval-policies" className="text-primary hover:underline">
              Approval Policies
            </a>
            .
          </p>

          {approvalEnabled && (
            <Label className="flex items-center gap-3 font-normal">
              <Checkbox
                checked={submissionEnabled}
                disabled={saving}
                onCheckedChange={(value) => handleSubmissionEnabledChange(value === true)}
              />
              Zusätzlich manuelles Einreichen verlangen (Timesheet Submission)
            </Label>
          )}
          {approvalEnabled && submissionEnabled && (
            <p className="mt-1 text-sm text-muted-foreground">
              Mit dieser Zusatzoption starten neue Einträge als Entwurf und müssen erst per „Woche einreichen&ldquo;
              bestätigt werden, bevor sie in die Genehmigung gehen — eine zusätzliche Stufe on top of Time
              Approval, keine Voraussetzung dafür.
            </p>
          )}
        </div>
      )}

      {isPrivileged && policy && (
        <>
          <h2 className="mt-8 mb-3 text-lg font-semibold">Time-Tracking-Policy</h2>
          <p className="mb-4 text-sm text-muted-foreground">Gilt org-weit für alle Zeitbuchungen.</p>

          <div className="mb-4">
            <Label className="mb-2 block">Tages-Limit (Stunden, leer = kein Limit)</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              className="w-36"
              value={maxDailyHours}
              disabled={policySaving}
              onChange={(event) => setMaxDailyHours(event.target.value)}
              onBlur={handleMaxDailyHoursBlur}
            />
          </div>

          <Label className="mb-2 flex items-center gap-3 font-normal">
            <Checkbox checked={blockWeekends} disabled={policySaving} onCheckedChange={(value) => handleBlockWeekendsChange(value === true)} />
            Zeiterfassung am Wochenende deaktivieren
          </Label>

          <Label className="flex items-center gap-3 font-normal">
            <Checkbox checked={blockOverlaps} disabled={policySaving} onCheckedChange={(value) => handleBlockOverlapsChange(value === true)} />
            Überschneidende Zeiteinträge blockieren
          </Label>

          {policyError && <p className="mt-3 text-sm text-destructive">{policyError}</p>}
        </>
      )}
    </div>
  );
}
