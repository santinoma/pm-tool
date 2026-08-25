import { getTenantBySubdomain } from "../platform/tenantRegistry";
import type { Tenant } from "../platform/tenantRegistry";

const BASE_DOMAIN_SUFFIXES = [".localhost", `.${process.env.BASE_DOMAIN ?? "localhost"}`];

/**
 * Extrahiert die Subdomain aus einem Hostnamen, z.B. "kunde.localhost" -> "kunde".
 * Liefert null für die nackte Basis-Domain selbst (z.B. "localhost") oder die
 * Admin-Domain, da dort keine Tenant-Auflösung stattfindet.
 */
export function extractSubdomain(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();

  for (const suffix of new Set(BASE_DOMAIN_SUFFIXES)) {
    if (hostname.endsWith(suffix)) {
      const subdomain = hostname.slice(0, -suffix.length);
      return subdomain.length > 0 ? subdomain : null;
    }
  }
  return null;
}

export async function resolveTenant(host: string): Promise<Tenant | null> {
  const subdomain = extractSubdomain(host);
  if (!subdomain || subdomain === "admin") {
    return null;
  }
  return getTenantBySubdomain(subdomain);
}
