const SUBDOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
const RESERVED_SUBDOMAINS = new Set(["www", "admin", "api", "app", "localhost"]);

export interface SubdomainValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateSubdomain(subdomain: string): SubdomainValidationResult {
  if (subdomain.length < 3 || subdomain.length > 63) {
    return { valid: false, reason: "Subdomain muss zwischen 3 und 63 Zeichen lang sein." };
  }
  if (subdomain !== subdomain.toLowerCase()) {
    return { valid: false, reason: "Subdomain darf nur Kleinbuchstaben enthalten." };
  }
  if (!SUBDOMAIN_PATTERN.test(subdomain)) {
    return {
      valid: false,
      reason:
        "Subdomain darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten und darf nicht mit einem Bindestrich beginnen oder enden.",
    };
  }
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return { valid: false, reason: `"${subdomain}" ist reserviert und kann nicht verwendet werden.` };
  }
  return { valid: true };
}
