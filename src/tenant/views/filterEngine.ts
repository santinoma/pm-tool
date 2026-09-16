// Reference "Filters": a saved view's filter is a tree of AND/OR groups over
// field/operator/value conditions, not a single flat set of dropdowns — this
// module is the entity-agnostic data model + evaluator. Callers supply a
// `getFieldValue(field)` accessor so the same tree shape works for tasks,
// budgets, deals, etc. without this module knowing about any of their schemas.
// UI wiring and entity-specific field accessors are a separate step (T202+).

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty"
  | "in"
  | "not_in"
  | "gt"
  | "lt"
  | "gte"
  | "lte";

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: unknown;
}

export interface FilterGroup {
  logic: "AND" | "OR";
  rules: FilterNode[];
}

export type FilterNode = FilterCondition | FilterGroup;

export function isFilterGroup(node: FilterNode): node is FilterGroup {
  return "logic" in node && "rules" in node;
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

export function evaluateCondition(condition: FilterCondition, getFieldValue: (field: string) => unknown): boolean {
  const actual = getFieldValue(condition.field);
  switch (condition.operator) {
    case "equals":
      return actual === condition.value;
    case "not_equals":
      return actual !== condition.value;
    case "contains":
      if (typeof actual === "string" && typeof condition.value === "string") {
        return actual.toLowerCase().includes(condition.value.toLowerCase());
      }
      return Array.isArray(actual) ? actual.includes(condition.value) : false;
    case "not_contains":
      return !evaluateCondition({ ...condition, operator: "contains" }, getFieldValue);
    case "is_empty":
      return isEmptyValue(actual);
    case "is_not_empty":
      return !isEmptyValue(actual);
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(actual);
    case "not_in":
      return Array.isArray(condition.value) && !condition.value.includes(actual);
    case "gt":
      return typeof actual === "number" && typeof condition.value === "number" && actual > condition.value;
    case "lt":
      return typeof actual === "number" && typeof condition.value === "number" && actual < condition.value;
    case "gte":
      return typeof actual === "number" && typeof condition.value === "number" && actual >= condition.value;
    case "lte":
      return typeof actual === "number" && typeof condition.value === "number" && actual <= condition.value;
  }
}

/** Empty groups (no rules yet, mid-edit in the builder UI) evaluate to true — "no filter applied". */
export function evaluateFilterNode(node: FilterNode, getFieldValue: (field: string) => unknown): boolean {
  if (isFilterGroup(node)) {
    if (node.rules.length === 0) return true;
    return node.logic === "AND"
      ? node.rules.every((rule) => evaluateFilterNode(rule, getFieldValue))
      : node.rules.some((rule) => evaluateFilterNode(rule, getFieldValue));
  }
  return evaluateCondition(node, getFieldValue);
}

const EMPTY_FILTER_GROUP: FilterGroup = { logic: "AND", rules: [] };

/**
 * Reads a SavedView's persisted `filterConfig` (a plain JSON blob) as a FilterGroup.
 * Also accepts the older, pre-filter-builder flat shape (`{statusFilter: "..."}`, still
 * possibly stored on views saved before this module existed) by converting it into an
 * equivalent single-condition group, so old saved views keep working unmigrated.
 */
export function parseFilterConfig(filterConfig: Record<string, unknown>): FilterGroup {
  if (filterConfig.logic === "AND" || filterConfig.logic === "OR") {
    return filterConfig as unknown as FilterGroup;
  }
  if (typeof filterConfig.statusFilter === "string" && filterConfig.statusFilter.length > 0) {
    return { logic: "AND", rules: [{ field: "status", operator: "equals", value: filterConfig.statusFilter }] };
  }
  return EMPTY_FILTER_GROUP;
}

/**
 * "Dynamic Me filter" (see the older flat resolveViewFilters.ts): a saved,
 * shared view's condition value may be the literal string "__ME__" instead of
 * a concrete user id, resolved to the current viewer's own id at load time —
 * the concrete id is never persisted. Walks nested groups, unlike the older
 * flat-only helper.
 */
export function resolveDynamicPlaceholders(node: FilterNode, currentUserId: string): FilterNode {
  if (isFilterGroup(node)) {
    return { ...node, rules: node.rules.map((rule) => resolveDynamicPlaceholders(rule, currentUserId)) };
  }
  return node.value === "__ME__" ? { ...node, value: currentUserId } : node;
}
