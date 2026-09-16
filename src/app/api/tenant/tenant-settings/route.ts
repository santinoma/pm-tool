import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { hasFeature } from "@/tenant/entitlements/features";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

const VALID_TIME_TRACKING_MODES = ["timer", "entries"];
const VALID_TIME_FORMATS = ["h12", "h24"];
const VALID_DATE_FORMATS = ["dd_mm_yyyy", "mm_dd_yyyy", "yyyy_mm_dd"];
const VALID_NUMBER_FORMATS = ["comma_decimal", "period_decimal"];

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const settings = await getOrCreateTenantSettings(context.tenantDb);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const moduleToggleKeys = ["crmEnabled", "reportsEnabled", "resourcingEnabled"] as const;
  const hasModuleToggle = moduleToggleKeys.some((key) => body?.[key] !== undefined);
  const locationFormatKeys = ["timeZone", "timeFormat", "dateFormat", "numberFormat"] as const;
  const hasLocationFormat = locationFormatKeys.some((key) => body?.[key] !== undefined);
  const workTimeKeys = ["weekStartDay", "workingDays", "personDayHours"] as const;
  const hasWorkTime = workTimeKeys.some((key) => body?.[key] !== undefined);
  const fiscalYearKeys = ["fiscalYearEnabled", "fiscalYearStartMonth"] as const;
  const hasFiscalYear = fiscalYearKeys.some((key) => body?.[key] !== undefined);
  const financialMonthClosingKeys = ["financialMonthClosingEnabled", "financialMonthClosingDay"] as const;
  const hasFinancialMonthClosing = financialMonthClosingKeys.some((key) => body?.[key] !== undefined);
  if (
    !body ||
    (body.allowProjectLevelTimeEntries === undefined &&
      body.currency === undefined &&
      body.triageEnabled === undefined &&
      body.timeTrackingMode === undefined &&
      body.require2fa === undefined &&
      body.timeApprovalEnabled === undefined &&
      body.timeEntrySubmissionEnabled === undefined &&
      !hasModuleToggle &&
      !hasLocationFormat &&
      !hasWorkTime &&
      !hasFiscalYear &&
      !hasFinancialMonthClosing)
  ) {
    return NextResponse.json(
      {
        error:
          "allowProjectLevelTimeEntries (boolean), currency (string), triageEnabled (boolean), timeTrackingMode ('timer'|'entries'), require2fa (boolean), timeApprovalEnabled (boolean), timeEntrySubmissionEnabled (boolean), ein Modul-Flag (crmEnabled/reportsEnabled/resourcingEnabled, boolean), Location & Format (timeZone/timeFormat/dateFormat/numberFormat), Work Time (weekStartDay/workingDays/personDayHours), Fiscal Year (fiscalYearEnabled/fiscalYearStartMonth) oder Financial Month Closing (financialMonthClosingEnabled/financialMonthClosingDay) ist erforderlich.",
      },
      { status: 400 },
    );
  }
  if (body.timeApprovalEnabled !== undefined && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  if (body.timeEntrySubmissionEnabled !== undefined && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  if (body.timeTrackingMode !== undefined && !VALID_TIME_TRACKING_MODES.includes(body.timeTrackingMode)) {
    return NextResponse.json({ error: "Ungültiger timeTrackingMode." }, { status: 400 });
  }
  if (body.require2fa !== undefined && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  if (body.require2fa === true && !hasFeature(context.entitledFeatures, "two_factor_scim")) {
    return NextResponse.json({ error: "2FA/SCIM ist im aktuellen Plan nicht enthalten." }, { status: 403 });
  }
  if (hasModuleToggle && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  if ((hasLocationFormat || hasWorkTime || hasFiscalYear) && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  if (body.timeFormat !== undefined && !VALID_TIME_FORMATS.includes(body.timeFormat)) {
    return NextResponse.json({ error: "Ungültiges timeFormat." }, { status: 400 });
  }
  if (body.dateFormat !== undefined && !VALID_DATE_FORMATS.includes(body.dateFormat)) {
    return NextResponse.json({ error: "Ungültiges dateFormat." }, { status: 400 });
  }
  if (body.numberFormat !== undefined && !VALID_NUMBER_FORMATS.includes(body.numberFormat)) {
    return NextResponse.json({ error: "Ungültiges numberFormat." }, { status: 400 });
  }
  if (
    body.weekStartDay !== undefined &&
    (typeof body.weekStartDay !== "number" || body.weekStartDay < 0 || body.weekStartDay > 6)
  ) {
    return NextResponse.json({ error: "weekStartDay muss zwischen 0 (Sonntag) und 6 (Samstag) liegen." }, { status: 400 });
  }
  if (
    body.workingDays !== undefined &&
    (!Array.isArray(body.workingDays) ||
      !body.workingDays.every((day: unknown) => typeof day === "number" && day >= 0 && day <= 6))
  ) {
    return NextResponse.json({ error: "workingDays muss ein Array von Wochentagen (0–6) sein." }, { status: 400 });
  }
  if (body.personDayHours !== undefined && (typeof body.personDayHours !== "number" || body.personDayHours <= 0)) {
    return NextResponse.json({ error: "personDayHours muss eine positive Zahl sein." }, { status: 400 });
  }
  if (
    body.fiscalYearStartMonth !== undefined &&
    (typeof body.fiscalYearStartMonth !== "number" || body.fiscalYearStartMonth < 1 || body.fiscalYearStartMonth > 12)
  ) {
    return NextResponse.json({ error: "fiscalYearStartMonth muss zwischen 1 und 12 liegen." }, { status: 400 });
  }
  if (
    hasFinancialMonthClosing &&
    !(await hasEffectivePermission(context.tenantDb, context.currentUser, context.entitledFeatures, "financial_month_closing_manage"))
  ) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  if (
    body.financialMonthClosingDay !== undefined &&
    (typeof body.financialMonthClosingDay !== "number" || body.financialMonthClosingDay < 1 || body.financialMonthClosingDay > 31)
  ) {
    return NextResponse.json({ error: "financialMonthClosingDay muss zwischen 1 und 31 liegen." }, { status: 400 });
  }

  const current = await getOrCreateTenantSettings(context.tenantDb);
  const updated = await context.tenantDb.tenantSettings.update({
    where: { id: current.id },
    data: {
      allowProjectLevelTimeEntries:
        typeof body.allowProjectLevelTimeEntries === "boolean"
          ? body.allowProjectLevelTimeEntries
          : undefined,
      currency: typeof body.currency === "string" ? body.currency : undefined,
      triageEnabled: typeof body.triageEnabled === "boolean" ? body.triageEnabled : undefined,
      timeTrackingMode:
        typeof body.timeTrackingMode === "string" ? body.timeTrackingMode : undefined,
      require2fa: typeof body.require2fa === "boolean" ? body.require2fa : undefined,
      timeApprovalEnabled: typeof body.timeApprovalEnabled === "boolean" ? body.timeApprovalEnabled : undefined,
      timeEntrySubmissionEnabled:
        typeof body.timeEntrySubmissionEnabled === "boolean" ? body.timeEntrySubmissionEnabled : undefined,
      crmEnabled: typeof body.crmEnabled === "boolean" ? body.crmEnabled : undefined,
      reportsEnabled: typeof body.reportsEnabled === "boolean" ? body.reportsEnabled : undefined,
      resourcingEnabled: typeof body.resourcingEnabled === "boolean" ? body.resourcingEnabled : undefined,
      timeZone: typeof body.timeZone === "string" ? body.timeZone : undefined,
      timeFormat: typeof body.timeFormat === "string" ? body.timeFormat : undefined,
      dateFormat: typeof body.dateFormat === "string" ? body.dateFormat : undefined,
      numberFormat: typeof body.numberFormat === "string" ? body.numberFormat : undefined,
      weekStartDay: typeof body.weekStartDay === "number" ? body.weekStartDay : undefined,
      workingDays: Array.isArray(body.workingDays) ? body.workingDays : undefined,
      personDayHours: typeof body.personDayHours === "number" ? body.personDayHours : undefined,
      fiscalYearEnabled: typeof body.fiscalYearEnabled === "boolean" ? body.fiscalYearEnabled : undefined,
      fiscalYearStartMonth: typeof body.fiscalYearStartMonth === "number" ? body.fiscalYearStartMonth : undefined,
      financialMonthClosingEnabled:
        typeof body.financialMonthClosingEnabled === "boolean" ? body.financialMonthClosingEnabled : undefined,
      financialMonthClosingDay:
        typeof body.financialMonthClosingDay === "number" ? body.financialMonthClosingDay : undefined,
    },
  });

  return NextResponse.json({ settings: updated });
}
