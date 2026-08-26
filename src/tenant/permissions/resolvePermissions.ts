import { computeEffectivePermissions, hasPermission, type PermissionKey } from "./permissionCatalog";
import type { PrismaClient, User } from "../../generated/tenant-client/client.js";
import type { FeatureKey } from "../entitlements/features";

export async function resolveEffectivePermissions(
  tenantDb: PrismaClient,
  user: User,
  entitledFeatures: Set<FeatureKey>,
  projectId?: string,
): Promise<Set<PermissionKey>> {
  const hasCustomRolesFeature = entitledFeatures.has("custom_roles");
  const hasProjectOverridesFeature = entitledFeatures.has("project_role_overrides");

  let customRolePermissions: string[] | null = null;
  if (hasCustomRolesFeature && user.customRoleId) {
    const customRole = await tenantDb.customRole.findUnique({ where: { id: user.customRoleId } });
    customRolePermissions = customRole?.permissions ?? null;
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
    hasCustomRolesFeature,
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
