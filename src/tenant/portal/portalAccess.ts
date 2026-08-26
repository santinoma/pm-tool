export function hasProjectAccess(grantedProjectIds: string[], projectId: string): boolean {
  return grantedProjectIds.includes(projectId);
}
