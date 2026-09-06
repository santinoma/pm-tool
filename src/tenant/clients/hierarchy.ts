/**
 * Client-Hierarchie: reine Hilfsfunktionen ohne DB-Zugriff.
 *
 * Verhindert Zyklen in der Parent/Child-Beziehung von Clients (z.B. A -> B -> A).
 */

export interface ClientParentRef {
  id: string;
  parentId: string | null;
}

/**
 * Berechnet die Menge aller Nachfahren-IDs eines Clients (Kinder, Kindeskinder, ...)
 * durch Auflaufen der flachen Liste aller Clients (id + parentId).
 */
export function computeDescendantIds(clientId: string, allClients: ClientParentRef[]): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const client of allClients) {
    if (!client.parentId) continue;
    const list = childrenByParent.get(client.parentId) ?? [];
    list.push(client.id);
    childrenByParent.set(client.parentId, list);
  }

  const descendants = new Set<string>();
  const queue = [...(childrenByParent.get(clientId) ?? [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (descendants.has(current)) continue;
    descendants.add(current);
    const children = childrenByParent.get(current);
    if (children) queue.push(...children);
  }
  return descendants;
}

/**
 * Prüft, ob das Setzen von `parentId` auf einem Client einen Zyklus erzeugen würde
 * (parentId ist der Client selbst oder einer seiner eigenen Nachfahren).
 */
export function wouldCreateCycle(clientId: string, parentId: string, allClients: ClientParentRef[]): boolean {
  if (parentId === clientId) return true;
  const descendants = computeDescendantIds(clientId, allClients);
  return descendants.has(parentId);
}
