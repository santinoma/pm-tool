import type { CustomFieldDef, PrismaClient } from "@/generated/tenant-client/client.js";

// T223/T224: TaskPriority/TaskTShirtSize started as native enum columns on Task
// (an Eigenentwicklung with no Productive doc basis — see EIGENENTWICKLUNGEN.md).
// Now that the generic Custom Field filter/sort system exists (T201-T208) and
// library fields auto-attach to new projects (T222), they're replaced by real
// select Custom Fields instead: this gives them Required/Sensitive support and
// makes them work with the same filter/sort UI as any other custom field.
export const PRIORITY_FIELD_KEY = "priority";
export const TSHIRT_SIZE_FIELD_KEY = "tshirt_size";

const PRIORITY_OPTIONS = ["No Priority", "Low", "Medium", "High", "Urgent"];
const TSHIRT_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"];

/** Maps the legacy TaskPriority enum value to this field's select option label. */
export const LEGACY_PRIORITY_TO_OPTION: Record<string, string> = {
  no_priority: "No Priority",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

async function getOrCreateLibraryField(
  tenantDb: PrismaClient,
  key: string,
  label: string,
  options: string[],
): Promise<CustomFieldDef> {
  const existing = await tenantDb.customFieldDef.findFirst({
    where: { library: true, entityType: "task", key },
  });
  if (existing) return existing;
  return tenantDb.customFieldDef.create({
    data: { library: true, entityType: "task", key, label, type: "select", options, autoAttach: true },
  });
}

/** Attaches a library field to every project that doesn't already have it (T222's auto-attach only covers new projects). */
async function ensureAttachedToAllProjects(tenantDb: PrismaClient, fieldId: string): Promise<void> {
  const projects = await tenantDb.project.findMany({ select: { id: true } });
  const attached = await tenantDb.projectCustomField.findMany({ where: { fieldId }, select: { projectId: true } });
  const attachedIds = new Set(attached.map((a) => a.projectId));
  const missing = projects.filter((p) => !attachedIds.has(p.id));
  if (missing.length > 0) {
    await tenantDb.projectCustomField.createMany({
      data: missing.map((p) => ({ projectId: p.id, fieldId })),
    });
  }
}

/**
 * Copies each task's legacy `priority` enum value into a CustomFieldValue for
 * the given field, for any task that still has a non-default legacy value —
 * idempotent, safe to call repeatedly (e.g. on every page load). The legacy
 * column is reset to "no_priority" in the same pass: once migrated, it's this
 * field's empty state, and resetting it is what makes the check above
 * ("still has a non-default legacy value") a reliable "not yet migrated"
 * marker — without it, a value the user later clears via the custom field
 * itself would otherwise get resurrected from the stale legacy column on the
 * next call.
 */
async function backfillPriorityValues(tenantDb: PrismaClient, fieldId: string): Promise<void> {
  const tasks = await tenantDb.task.findMany({
    where: { priority: { not: "no_priority" } },
    select: { id: true, priority: true },
  });
  for (const task of tasks) {
    await tenantDb.customFieldValue.upsert({
      where: { fieldId_taskId: { fieldId, taskId: task.id } },
      create: { taskId: task.id, fieldId, value: LEGACY_PRIORITY_TO_OPTION[task.priority] ?? task.priority },
      update: {},
    });
    await tenantDb.task.update({ where: { id: task.id }, data: { priority: "no_priority" } });
  }
}

/** Same as backfillPriorityValues, for TaskTShirtSize (legacy empty state: null). */
async function backfillTShirtSizeValues(tenantDb: PrismaClient, fieldId: string): Promise<void> {
  const tasks = await tenantDb.task.findMany({
    where: { tShirtSize: { not: null } },
    select: { id: true, tShirtSize: true },
  });
  for (const task of tasks) {
    await tenantDb.customFieldValue.upsert({
      where: { fieldId_taskId: { fieldId, taskId: task.id } },
      create: { taskId: task.id, fieldId, value: task.tShirtSize! },
      update: {},
    });
    await tenantDb.task.update({ where: { id: task.id }, data: { tShirtSize: null } });
  }
}

export interface SystemTaskFields {
  priorityField: CustomFieldDef;
  tShirtSizeField: CustomFieldDef;
}

/** Ensures both system fields exist, are attached to every project, and legacy column values are backfilled. */
export async function getOrCreateSystemTaskFields(tenantDb: PrismaClient): Promise<SystemTaskFields> {
  const [priorityField, tShirtSizeField] = await Promise.all([
    getOrCreateLibraryField(tenantDb, PRIORITY_FIELD_KEY, "Priority", PRIORITY_OPTIONS),
    getOrCreateLibraryField(tenantDb, TSHIRT_SIZE_FIELD_KEY, "T-Shirt Size", TSHIRT_SIZE_OPTIONS),
  ]);
  await Promise.all([
    ensureAttachedToAllProjects(tenantDb, priorityField.id),
    ensureAttachedToAllProjects(tenantDb, tShirtSizeField.id),
    backfillPriorityValues(tenantDb, priorityField.id),
    backfillTShirtSizeValues(tenantDb, tShirtSizeField.id),
  ]);
  return { priorityField, tShirtSizeField };
}
