import type { PrismaClient } from "@/generated/tenant-client/client.js";

/**
 * Läuft die managerId-Kette ab proposedManagerId nach oben (managerId → managerId → …)
 * und prüft, ob dabei userId erreicht wird. Falls ja, würde die Zuweisung
 * "proposedManagerId ist Manager von userId" einen Zyklus erzeugen (z. B. A→B→C→A).
 *
 * Die Traversal selbst ist in loadManagerChain isoliert, damit sie ohne echte DB
 * (per In-Memory-Lookup-Funktion) getestet werden kann; wouldCreateManagerCycle
 * verdrahtet das nur mit Prisma.
 */
export async function loadManagerChain(
  startUserId: string,
  getManagerId: (userId: string) => Promise<string | null>,
  maxDepth = 1000,
): Promise<string[]> {
  const chain: string[] = [];
  let currentId: string | null = startUserId;
  let depth = 0;
  while (currentId && depth < maxDepth) {
    chain.push(currentId);
    currentId = await getManagerId(currentId);
    depth += 1;
  }
  return chain;
}

export async function wouldCreateManagerCycle(
  tenantDb: PrismaClient,
  userId: string,
  proposedManagerId: string,
): Promise<boolean> {
  if (userId === proposedManagerId) {
    return true;
  }
  const chain = await loadManagerChain(proposedManagerId, async (id) => {
    const user = await tenantDb.user.findUnique({ where: { id }, select: { managerId: true } });
    return user?.managerId ?? null;
  });
  return chain.includes(userId);
}
