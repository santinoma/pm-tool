export interface TemplateStatus {
  name: string;
  category: "not_started" | "started" | "done";
  position: number;
  isDefault: boolean;
}

/**
 * Baut die zu klonenden Workflow-Status aus einem Vorlagen-Projekt — reine
 * Transformation, keine DB-Zugriffe. `id` wird bewusst nicht übernommen, das
 * neue Projekt bekommt eigene Status-Zeilen.
 */
export function buildClonedStatuses(
  templateStatuses: { name: string; category: string; position: number; isDefault: boolean }[],
): TemplateStatus[] {
  return templateStatuses
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((status) => ({
      name: status.name,
      category: status.category as TemplateStatus["category"],
      position: status.position,
      isDefault: status.isDefault,
    }));
}
