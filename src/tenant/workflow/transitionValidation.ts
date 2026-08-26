export const BUILT_IN_FIELD_LABELS: Record<string, string> = {
  assignee: "Zuständige Person",
  dueDate: "Fälligkeitsdatum",
  estimatedHours: "Geschätzte Stunden",
};

export interface TransitionRuleInput {
  fromStatusId: string | null;
  toStatusId: string;
  requiredFieldKeys: string[];
}

export interface TaskFieldState {
  assignee: boolean;
  dueDate: boolean;
  estimatedHours: boolean;
  filledCustomFieldIds: Set<string>;
}

export function collectRequiredFieldKeys(
  rules: TransitionRuleInput[],
  fromStatusId: string,
  toStatusId: string,
): Set<string> {
  const keys = new Set<string>();
  for (const rule of rules) {
    if (rule.toStatusId !== toStatusId) continue;
    if (rule.fromStatusId !== null && rule.fromStatusId !== fromStatusId) continue;
    for (const key of rule.requiredFieldKeys) {
      keys.add(key);
    }
  }
  return keys;
}

function isFieldFilled(key: string, state: TaskFieldState): boolean {
  if (key.startsWith("custom:")) {
    return state.filledCustomFieldIds.has(key.slice("custom:".length));
  }
  if (key === "assignee") return state.assignee;
  if (key === "dueDate") return state.dueDate;
  if (key === "estimatedHours") return state.estimatedHours;
  return true;
}

export function findMissingRequiredFields(
  requiredKeys: Set<string>,
  state: TaskFieldState,
  customFieldLabels: Record<string, string>,
): string[] {
  const missing: string[] = [];
  for (const key of requiredKeys) {
    if (isFieldFilled(key, state)) continue;
    if (key.startsWith("custom:")) {
      missing.push(customFieldLabels[key.slice("custom:".length)] ?? key);
    } else {
      missing.push(BUILT_IN_FIELD_LABELS[key] ?? key);
    }
  }
  return missing;
}
