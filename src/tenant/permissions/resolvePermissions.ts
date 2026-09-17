import { computeEffectivePermissions, hasPermission, type PermissionKey } from "./permissionCatalog";
import { getDefaultSystemSetNameForRole, getOrCreateSystemPermissionSets } from "./systemPermissionSets";
import type { PrismaClient, User } from "../../generated/tenant-client/client.js";
import type { FeatureKey } from "../entitlements/features";

/**
 * T402: ein explizit gesetztes `customRoleId` wirkt IMMER, wenn es ein
 * System-Permission-Set ist (die acht Productive-Standardprofile — nicht an
 * `custom_roles`/Ultimate gebunden), sonst nur bei echter (nicht-System-)
 * Custom Role UND gebuchtem `custom_roles`-Feature. Fehlt ein nutzbares
 * `customRoleId`, wird automatisch auf das zur Legacy-Basisrolle passende
 * System-Set zurückgefallen (owner/admin → Admin, member → Staff, client →
 * Client Collaborator) statt auf das grobe alte `LEGACY_ROLE_PERMISSIONS`.
 */
export async function resolveEffectivePermissions(
  tenantDb: PrismaClient,
  user: User,
  entitledFeatures: Set<FeatureKey>,
  projectId?: string,
): Promise<Set<PermissionKey>> {
  const hasCustomRolesFeature = entitledFeatures.has("custom_roles");
  const hasProjectOverridesFeature = entitledFeatures.has("project_role_overrides");

  let customRolePermissions: string[] | null = null;
  let resolvedViaSystemOrEntitledCustomRole = false;

  if (user.customRoleId) {
    const customRole = await tenantDb.customRole.findUnique({ where: { id: user.customRoleId } });
    if (customRole && (customRole.isSystem || hasCustomRolesFeature)) {
      customRolePermissions = customRole.permissions;
      resolvedViaSystemOrEntitledCustomRole = true;
    }
  }

  if (!resolvedViaSystemOrEntitledCustomRole) {
    const systemSetName = getDefaultSystemSetNameForRole(user.role);
    let systemSet = await tenantDb.customRole.findFirst({ where: { name: systemSetName, isSystem: true } });
    if (!systemSet) {
      await getOrCreateSystemPermissionSets(tenantDb);
      systemSet = await tenantDb.customRole.findFirst({ where: { name: systemSetName, isSystem: true } });
    }
    if (systemSet) {
      customRolePermissions = systemSet.permissions;
      resolvedViaSystemOrEntitledCustomRole = true;
    }
  }

  let projectOverridePermissions: string[] | null = null;
  if (hasProjectOverridesFeature && projectId) {
    const override = await tenantDb.projectRoleOverride.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
      include: { customRole: true },
    });
    projectOverridePermissions = override?.customRole.permissions ?? null;
  }

  return computeEffectivePermissions({
    baseRole: user.role,
    customRolePermissions,
    projectOverridePermissions,
    // Fallback auf LEGACY_ROLE_PERMISSIONS nur im (praktisch unerreichbaren)
    // Fall, dass selbst das Self-Healing-Seeding fehlschlug.
    hasCustomRolesFeature: resolvedViaSystemOrEntitledCustomRole ? true : hasCustomRolesFeature,
    hasProjectOverridesFeature,
  });
}

export async function hasEffectivePermission(
  tenantDb: PrismaClient,
  user: User,
  entitledFeatures: Set<FeatureKey>,
  key: PermissionKey,
  projectId?: string,
): Promise<boolean> {
  const effective = await resolveEffectivePermissions(tenantDb, user, entitledFeatures, projectId);
  return hasPermission(effective, key);
}
