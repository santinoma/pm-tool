/**
 * Reine Validierungslogik für die SSO-Konfiguration eines Tenants — getrennt
 * vom Route-Handler, damit sie isoliert getestet werden kann.
 */
export interface SsoConfigInput {
  provider?: unknown;
  entryPoint?: unknown;
  issuer?: unknown;
  cert?: unknown;
}

export interface SsoConfigValidationResult {
  valid: boolean;
  error?: string;
}

const VALID_PROVIDERS = ["google", "okta", "entra", "generic"];

/** Grobe, aber wirksame Prüfung: sieht das nach einem PEM-Zertifikat aus? */
export function looksLikePemCertificate(cert: string): boolean {
  return cert.trim().startsWith("-----BEGIN CERTIFICATE-----") && cert.includes("-----END CERTIFICATE-----");
}

function looksLikeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateSsoConfigInput(input: SsoConfigInput): SsoConfigValidationResult {
  if (typeof input.provider !== "string" || !VALID_PROVIDERS.includes(input.provider)) {
    return { valid: false, error: `provider muss einer von ${VALID_PROVIDERS.join(", ")} sein.` };
  }
  if (typeof input.entryPoint !== "string" || !looksLikeUrl(input.entryPoint)) {
    return { valid: false, error: "entryPoint muss eine gültige URL sein." };
  }
  if (typeof input.issuer !== "string" || input.issuer.trim().length === 0) {
    return { valid: false, error: "issuer darf nicht leer sein." };
  }
  if (typeof input.cert !== "string" || !looksLikePemCertificate(input.cert)) {
    return {
      valid: false,
      error: "cert muss ein PEM-Zertifikat sein (beginnend mit -----BEGIN CERTIFICATE-----).",
    };
  }
  return { valid: true };
}
