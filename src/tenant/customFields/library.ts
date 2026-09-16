import type { PrismaClient, CustomFieldEntityType } from "@/generated/tenant-client/client.js";

/**
 * A project's usable custom fields are its own project-specific fields
 * (library=false, projectId=this project) plus any library fields (defined
 * once, tenant-wide) attached to it via ProjectCustomField — mirroring how
 * a project's Workflow can be its own or a shared one.
 */
export async function getEffectiveCustomFields(tenantDb: PrismaClient, projectId: string, entityType: CustomFieldEntityType) {
  return tenantDb.customFieldDef.findMany({
    where: {
      entityType,
      OR: [{ projectId, library: false }, { library: true, projectAttachments: { some: { projectId } } }],
    },
    orderBy: { label: "asc" },
  });
}

/** Same resolution as getEffectiveCustomFields, but across every entity type at once. */
export async function getAllEffectiveCustomFields(tenantDb: PrismaClient, projectId: string) {
  return tenantDb.customFieldDef.findMany({
    where: {
      OR: [{ projectId, library: false }, { library: true, projectAttachments: { some: { projectId } } }],
    },
    orderBy: { label: "asc" },
  });
}
