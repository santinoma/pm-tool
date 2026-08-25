import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/tenant-client/client.js";

const clientCache = new Map<string, PrismaClient>();

/**
 * Liefert einen (gecachten) Prisma-Client für die Tenant-Datenbank an der gegebenen
 * Connection-URL. Derselbe dbUrl liefert immer denselben Client-Instanz zurück, damit
 * nicht pro Request neu verbunden wird.
 */
export function getTenantDbClient(dbUrl: string): PrismaClient {
  const cached = clientCache.get(dbUrl);
  if (cached) {
    return cached;
  }
  const adapter = new PrismaPg({ connectionString: dbUrl });
  const client = new PrismaClient({ adapter });
  clientCache.set(dbUrl, client);
  return client;
}
