export type CustomFieldTypeName = "text" | "number" | "select" | "date";

export interface CustomFieldValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validiert einen roh als String übergebenen Custom-Field-Wert gegen seinen Typ,
 * bevor er gespeichert wird. `options` ist nur für `type = "select"` relevant.
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
  }
}

export type ParsedCustomFieldValue = string | number | Date;

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
    default:
      return raw;
  }
}
