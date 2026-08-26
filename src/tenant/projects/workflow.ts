export type StatusCategoryName = "not_started" | "started" | "done";

export interface DefaultWorkflowStatus {
  name: string;
  category: StatusCategoryName;
  position: number;
  isDefault: boolean;
}

export function defaultWorkflowStatuses(): DefaultWorkflowStatus[] {
  return [
    { name: "Todo", category: "not_started", position: 0, isDefault: true },
    { name: "In Progress", category: "started", position: 1, isDefault: false },
    { name: "Done", category: "done", position: 2, isDefault: false },
  ];
}

export interface DependencyEdge {
  blockingTaskId: string;
  blockedTaskId: string;
}

/**
 * Prüft, ob das Hinzufügen von `newEdge` zu `existingEdges` einen Zyklus erzeugen würde.
 * Reine Graph-Traversierung (DFS), keine DB-Abhängigkeit.
 */
export function detectDependencyCycle(
  existingEdges: DependencyEdge[],
  newEdge: DependencyEdge,
): boolean {
  if (newEdge.blockingTaskId === newEdge.blockedTaskId) {
    return true;
  }

  const allEdges = [...existingEdges, newEdge];
  const adjacency = new Map<string, string[]>();
  for (const edge of allEdges) {
    const list = adjacency.get(edge.blockingTaskId) ?? [];
    list.push(edge.blockedTaskId);
    adjacency.set(edge.blockingTaskId, list);
  }

  // Zyklus liegt vor, wenn man von newEdge.blockedTaskId aus wieder zu
  // newEdge.blockingTaskId zurückfindet.
  const visited = new Set<string>();
  const stack = [newEdge.blockedTaskId];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (current === newEdge.blockingTaskId) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    for (const next of adjacency.get(current) ?? []) {
      stack.push(next);
    }
  }

  return false;
}
