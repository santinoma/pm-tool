import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { parseCsv, validateClientImportRow } from "@/tenant/dataImport/csvImport";

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

  const rowErrors: { row: number; errors: string[] }[] = [];
  records.forEach((record, index) => {
    const result = validateClientImportRow(record);
    if (!result.valid) {
      rowErrors.push({ row: index + 2, errors: result.errors });
    }
  });

  if (rowErrors.length > 0) {
    return NextResponse.json({ error: "CSV enthält ungültige Zeilen.", rowErrors }, { status: 400 });
  }

  let imported = 0;
  for (const record of records) {
    await context.tenantDb.client.create({
      data: {
        name: record.name.trim(),
        note: record.note?.trim() ? record.note.trim() : null,
      },
    });
    imported += 1;
  }

  return NextResponse.json({ imported });
}
