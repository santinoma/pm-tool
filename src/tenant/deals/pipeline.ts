import type { PrismaClient, Pipeline, LostReason } from "@/generated/tenant-client/client.js";

// Reference "Setting up Your Sales Pipelines": every tenant has one shared "Default
// Pipeline" new deals use unless a specific pipeline is chosen — mirrors
// getOrCreateDefaultWorkflow for tasks.
export async function getOrCreateDefaultPipeline(tenantDb: PrismaClient): Promise<Pipeline> {
  const existing = await tenantDb.pipeline.findFirst({ where: { name: "Default Pipeline", archived: false } });
  if (existing) {
    return existing;
  }
  return tenantDb.pipeline.create({
    data: {
      name: "Default Pipeline",
      statuses: {
        create: [
          { name: "Lead", category: "open", position: 0, defaultProbability: 10 },
          { name: "Qualified", category: "open", position: 1, defaultProbability: 40 },
          { name: "Proposal", category: "open", position: 2, defaultProbability: 70 },
          { name: "Won", category: "won", position: 3, defaultProbability: 100 },
          { name: "Lost", category: "lost", position: 4, defaultProbability: 0 },
        ],
      },
    },
  });
}

const DEFAULT_LOST_REASON_LABELS = ["Nicht der richtige Fit", "Anderes Tool gewählt", "Preis zu hoch", "Unrealistischer Zeitplan"];

// Reference "General Sales Settings: ... Lost Reasons": seeds a small starter
// catalog so the "mark as lost" dropdown is never empty for a new tenant — mirrors
// getOrCreateDefaultPipeline's lazy-seed approach rather than a provisioning step.
export async function ensureDefaultLostReasons(tenantDb: PrismaClient): Promise<LostReason[]> {
  const existing = await tenantDb.lostReason.findMany({ orderBy: { label: "asc" } });
  if (existing.length > 0) {
    return existing;
  }
  await tenantDb.lostReason.createMany({
    data: DEFAULT_LOST_REASON_LABELS.map((label) => ({ label })),
    skipDuplicates: true,
  });
  return tenantDb.lostReason.findMany({ orderBy: { label: "asc" } });
}
