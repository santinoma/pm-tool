import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/platform-client/client.js";

declare global {
  // eslint-disable-next-line no-var
  var __platformPrisma: PrismaClient | undefined;
}

function createPlatformClient(): PrismaClient {
  const connectionString = process.env.PLATFORM_DATABASE_URL;
  if (!connectionString) {
    throw new Error("PLATFORM_DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Next.js Hot-Reload erzeugt in dev sonst bei jedem Modul-Reload einen neuen Client
// mit eigenem Connection-Pool — global cachen, um das zu vermeiden.
export const platformDb: PrismaClient = globalThis.__platformPrisma ?? createPlatformClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__platformPrisma = platformDb;
}
