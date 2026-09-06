export type CustomFieldTypeName = "text" | "number" | "select" | "multi_select" | "date" | "person" | "url" | "percent";

export interface CustomFieldValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validiert einen roh als String übergebenen Custom-Field-Wert gegen seinen Typ,
 * bevor er gespeichert wird. `options` ist nur für `select`/`multi_select` relevant.
 * `multi_select` speichert seinen Wert als JSON-codiertes String-Array im selben
 * String-Feld wie alle anderen Typen — kein Schema-Sonderfall nötig.
 * `person` wird hier nur strukturell geprüft (nicht-leerer String); ob die
 * User-ID tatsächlich existiert, prüft der Aufrufer mit DB-Zugriff.
 */
export function validateCustomFieldValue(
  type: CustomFieldTypeName,
  raw: string,
  options: string[] = [],
): CustomFieldValidationResult {
  switch (type) {
    case "text":
      return { valid: true };
    case "number":
      if (raw.trim() === "" || !Number.isFinite(Number(raw))) {
        return { valid: false, reason: "Wert muss eine Zahl sein." };
      }
      return { valid: true };
    case "date": {
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) {
        return { valid: false, reason: "Wert muss ein gültiges Datum sein." };
      }
      return { valid: true };
    }
    case "select":
      if (!options.includes(raw)) {
        return {
          valid: false,
          reason: `Wert muss einer der definierten Optionen sein: ${options.join(", ")}.`,
        };
      }
      return { valid: true };
    case "multi_select": {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { valid: false, reason: "Wert muss ein JSON-Array von Optionen sein." };
      }
      if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === "string")) {
        return { valid: false, reason: "Wert muss ein JSON-Array von Optionen sein." };
      }
      const invalid = parsed.filter((entry) => !options.includes(entry));
      if (invalid.length > 0) {
        return {
          valid: false,
          reason: `Ungültige Optionen: ${invalid.join(", ")}. Erlaubt: ${options.join(", ")}.`,
        };
      }
      return { valid: true };
    }
    case "person":
      if (raw.trim() === "") {
        return { valid: false, reason: "Wert darf nicht leer sein." };
      }
      return { valid: true };
    case "url":
      return { valid: true };
    case "percent": {
      const value = Number(raw);
      if (raw.trim() === "" || !Number.isFinite(value) || value < 0 || value > 100) {
        return { valid: false, reason: "Wert muss eine Zahl zwischen 0 und 100 sein." };
      }
      return { valid: true };
    }
  }
}

export type ParsedCustomFieldValue = string | number | Date | string[];

/**
 * Wandelt den validierten String-Rohwert in den typgerechten JS-Wert für die Anzeige um.
 * Aufrufer sollten vorher `validateCustomFieldValue` erfolgreich durchlaufen haben.
 */
export function parseCustomFieldValue(
  type: CustomFieldTypeName,
  raw: string,
): ParsedCustomFieldValue {
  switch (type) {
    case "number":
      return Number(raw);
    case "date":
      return new Date(raw);
    case "multi_select":
      try {
        return JSON.parse(raw) as string[];
      } catch {
        return [];
      }
    default:
      return raw;
  }
}
