/**
 * Minimaler Ausschnitt aus samlifys `ExtractorResult` — bewusst lokal
 * definiert statt aus einem internen `samlify`-Unterpfad importiert, um nicht
 * von dessen Modulauflösung/Exportstruktur abhängig zu sein.
 */
export interface SamlExtractResult {
  nameID?: string;
  attributes?: Record<string, string | string[]>;
}

const EMAIL_ATTRIBUTE_KEYS = [
  "email",
  "mail",
  "emailaddress",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  "urn:oid:0.9.2342.19200300.100.1.3",
];

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Extrahiert die E-Mail-Adresse aus einer geparsten SAML-Assertion. Manche
 * IdPs senden die E-Mail als NameID, andere als zusätzliches Attribut —
 * daher wird zuerst das NameID geprüft (Standardfall) und andernfalls nach
 * gängigen E-Mail-Attributnamen gesucht.
 */
export function extractSsoEmail(extract: SamlExtractResult): string | null {
  if (extract.nameID && extract.nameID.includes("@")) {
    return extract.nameID;
  }

  const attributes = extract.attributes;
  if (attributes) {
    for (const key of EMAIL_ATTRIBUTE_KEYS) {
      const match = Object.keys(attributes).find((k) => k.toLowerCase() === key.toLowerCase());
      if (match) {
        const value = firstValue(attributes[match]);
        if (value) return value;
      }
    }
  }

  // Fallback: NameID auch ohne "@"-Zeichen verwenden, falls kein
  // E-Mail-Attribut vorhanden ist (manche generischen IdPs schicken hier
  // trotzdem die E-Mail-Adresse, nur ohne dass wir sie erkennen konnten).
  return extract.nameID ?? null;
}
