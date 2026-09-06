import { cloneBudgetSections, type SourceBudgetSection, type ClonedBudgetSection } from "./cloneBudgetSections";

export interface SourceRecurringBudget {
  title: string;
  projectId: string;
  ownerId: string;
  recurrenceInterval: "weekly" | "monthly";
}

export interface ClonedRecurringBudget {
  title: string;
  projectId: string;
  ownerId: string;
  isRetainer: boolean;
  recurrenceInterval: "weekly" | "monthly";
  sections: ClonedBudgetSection[];
}

/**
 * Baut die zu klonenden Felder für eine neue Perioden-Instanz eines Retainer-Budgets —
 * reine Transformation, keine DB-Zugriffe. Übernimmt `title`/`projectId`/`ownerId`/
 * `recurrenceInterval` sowie alle Sections (frisch, `budgetUsed: 0`); übernimmt
 * bewusst NICHT `isScenario`/`scenarioOfId`/`deliveredAt`/`isTemplate` vom Original.
 *
 * Design-Entscheidung: die neu erzeugte Instanz ist selbst KEIN Retainer
 * (`isRetainer: false`) — nur das ursprüngliche Retainer-Budget wiederholt sich weiter;
 * die generierten Perioden-Instanzen sind normale, einmalige Budgets.
 */
export function buildRecurringBudgetClone(
  sourceBudget: SourceRecurringBudget,
  sourceSections: SourceBudgetSection[],
): ClonedRecurringBudget {
  return {
    title: sourceBudget.title,
    projectId: sourceBudget.projectId,
    ownerId: sourceBudget.ownerId,
    isRetainer: false,
    recurrenceInterval: sourceBudget.recurrenceInterval,
    sections: cloneBudgetSections(sourceSections),
  };
}
