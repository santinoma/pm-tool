import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { parseCsv, validateTaskImportRow } from "@/tenant/dataImport/csvImport";
import { resolveInitialTriageState } from "@/tenant/projects/triageState";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";

function rowsToRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = row[index] ?? "";
    });
    return record;
  });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, projectId);
  if (denied) return denied;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Datei ist erforderlich." }, { status: 400 });
  }

  const content = await file.text();
  const rows = parseCsv(content).filter((row) => row.some((cell) => cell.trim().length > 0));
  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV ist leer." }, { status: 400 });
  }
  const records = rowsToRecords(rows);

  const [statuses, users] = await Promise.all([
    context.tenantDb.workflowStatus.findMany({ where: { projectId: projectId! } }),
    context.tenantDb.user.findMany({ where: { isActive: true } }),
  ]);
  const validStatusNames = statuses.map((s) => s.name);
  const validUserEmails = users.map((u) => u.email);

  const rowErrors: { row: number; errors: string[] }[] = [];
  records.forEach((record, index) => {
    const result = validateTaskImportRow(record, { validStatusNames, validUserEmails });
    if (!result.valid) {
      rowErrors.push({ row: index + 2, errors: result.errors }); // +2: 1-indexed + header row
    }
  });

  if (rowErrors.length > 0) {
    return NextResponse.json({ error: "CSV enthält ungültige Zeilen.", rowErrors }, { status: 400 });
  }

  const defaultStatus = statuses.find((s) => s.isDefault);
  const settings = await getOrCreateTenantSettings(context.tenantDb);

  let imported = 0;
  for (const record of records) {
    const status = record.status?.trim()
      ? statuses.find((s) => s.name === record.status.trim())
      : defaultStatus;
    if (!status) {
      // Should not happen given validation above unless project has no default status.
      return NextResponse.json(
        { error: "Projekt hat keinen Default-Status. Kann keine Tasks importieren." },
        { status: 409 },
      );
    }
    const assigneeEmail = record.assigneeEmail?.trim();
    const assignee = assigneeEmail ? users.find((u) => u.email === assigneeEmail) : null;

    await context.tenantDb.task.create({
      data: {
        title: record.title.trim(),
        statusId: status.id,
        assigneeId: assignee?.id ?? null,
        dueDate: record.dueDate?.trim() ? new Date(record.dueDate.trim()) : null,
        estimatedHours: record.estimatedHours?.trim() ? Number(record.estimatedHours.trim()) : null,
        inTriage: resolveInitialTriageState(settings.triageEnabled),
        projects: { create: { projectId: projectId!, isPrimary: true } },
      },
    });
    imported += 1;
  }

  return NextResponse.json({ imported });
}
