/**
 * CSV-Import: reine Parsing- und Validierungslogik ohne DB-Zugriff.
 *
 * Bewusst schlank gehalten: kein generischer Mapping-Engine, sondern zwei
 * konkrete Importer (Tasks, Clients) mit fest definierten Spalten.
 */

/**
 * Minimaler, abhängigkeitsfreier CSV-Parser.
 * Unterstützt: quotierte Felder (auch mit eingebetteten Kommas/Zeilenumbrüchen),
 * escapte Anführungszeichen ("" innerhalb eines quotierten Feldes) sowie
 * \n- und \r\n-Zeilenenden.
 */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = content.length;
  let rowHasContent = false;

  function pushField() {
    row.push(field);
    field = "";
  }

  function pushRow() {
    pushField();
    rows.push(row);
    row = [];
    rowHasContent = false;
  }

  while (i < len) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      rowHasContent = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      rowHasContent = true;
      pushField();
      i += 1;
      continue;
    }

    if (char === "\r") {
      if (content[i + 1] === "\n") {
        rowHasContent = true;
        pushRow();
        i += 2;
        continue;
      }
      rowHasContent = true;
      pushRow();
      i += 1;
      continue;
    }

    if (char === "\n") {
      rowHasContent = true;
      pushRow();
      i += 1;
      continue;
    }

    rowHasContent = true;
    field += char;
    i += 1;
  }

  // Letztes Feld/Zeile ohne abschließenden Zeilenumbruch.
  if (rowHasContent || field.length > 0) {
    pushRow();
  }

  return rows;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value.trim())) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isValidPositiveNumber(value: string): boolean {
  if (value.trim().length === 0) return false;
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

export interface TaskImportContext {
  validStatusNames: string[];
  validUserEmails: string[];
}

export function validateTaskImportRow(
  row: Record<string, string>,
  context: TaskImportContext,
): ImportValidationResult {
  const errors: string[] = [];

  const title = row.title?.trim() ?? "";
  if (title.length === 0) {
    errors.push("title ist erforderlich.");
  }

  const status = row.status?.trim();
  if (status && !context.validStatusNames.includes(status)) {
    errors.push(`status "${status}" ist kein gültiger Status.`);
  }

  const assigneeEmail = row.assigneeEmail?.trim();
  if (assigneeEmail && !context.validUserEmails.includes(assigneeEmail)) {
    errors.push(`assigneeEmail "${assigneeEmail}" ist keinem Benutzer zugeordnet.`);
  }

  const dueDate = row.dueDate?.trim();
  if (dueDate && !isValidIsoDate(dueDate)) {
    errors.push(`dueDate "${dueDate}" ist kein gültiges ISO-Datum.`);
  }

  const estimatedHours = row.estimatedHours?.trim();
  if (estimatedHours && !isValidPositiveNumber(estimatedHours)) {
    errors.push(`estimatedHours "${estimatedHours}" ist keine gültige positive Zahl.`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateClientImportRow(row: Record<string, string>): ImportValidationResult {
  const errors: string[] = [];

  const name = row.name?.trim() ?? "";
  if (name.length === 0) {
    errors.push("name ist erforderlich.");
  }

  return { valid: errors.length === 0, errors };
}
