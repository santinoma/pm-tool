/**
 * "Dynamic Me filter": a saved view's filterConfig may store the literal
 * string "__ME__" for a field like `assigneeId` instead of a concrete user
 * id, so a shared view means "assigned to whoever is looking at it" for
 * every viewer. This helper resolves that placeholder to the current
 * viewer's own user id at load time — the concrete id is never persisted.
 *
 * Only top-level values are replaced; nested objects are left untouched.
 */
export function resolveViewFilters(
  filterConfig: Record<string, unknown>,
  currentUserId: string,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filterConfig)) {
    resolved[key] = value === "__ME__" ? currentUserId : value;
  }
  return resolved;
}
