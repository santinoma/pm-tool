/**
 * Reines CSV-Export-Modul — kein Prisma-Zugriff hier. Nimmt bereits geladene
 * Zeilen-Arrays und eine Spaltendefinition entgegen und produziert einen
 * CSV-String nach RFC 4180: Felder mit Komma, Anführungszeichen oder
 * Zeilenumbruch werden in Anführungszeichen gesetzt, eingebettete
 * Anführungszeichen werden verdoppelt.
 */

export interface CsvColumn {
  key: string;
  label: string;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const stringValue =
    typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : value instanceof Date
          ? value.toISOString()
          : String(value);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function buildCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const headerLine = columns.map((column) => escapeCsvValue(column.label)).join(",");
  const lines = rows.map((row) => columns.map((column) => escapeCsvValue(row[column.key])).join(","));
  return [headerLine, ...lines].join("\r\n");
}
