export const FEATURE_KEYS = [
  "budgets_financials",
  "cycles_sprints",
  "automation_rules",
  "workflow_transition_rules",
  "client_portal",
  "shared_views",
  "cross_board_relations",
  "integrations_marketplace",
  "two_factor_scim",
  "portfolios_goals",
  "baseline_diffing",
  "slack_capture",
  "dedicated_infra",
  "custom_roles",
  "project_role_overrides",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type PlanKey = "small" | "medium" | "enterprise";

const MEDIUM_FEATURES: FeatureKey[] = [
  "budgets_financials",
  "cycles_sprints",
  "automation_rules",
  "workflow_transition_rules",
  "client_portal",
  "shared_views",
  "cross_board_relations",
  "integrations_marketplace",
  "two_factor_scim",
  "custom_roles",
];

export const PLAN_FEATURES: Record<PlanKey, FeatureKey[]> = {
  small: [],
  medium: MEDIUM_FEATURES,
  enterprise: [
    ...MEDIUM_FEATURES,
    "portfolios_goals",
    "baseline_diffing",
    "slack_capture",
    "dedicated_infra",
    "project_role_overrides",
  ],
};

function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}

export function computeEntitledFeatures(plan: PlanKey, addOnFeatures: string[]): Set<FeatureKey> {
  const entitled = new Set<FeatureKey>(PLAN_FEATURES[plan] ?? []);
  for (const addOn of addOnFeatures) {
    if (isFeatureKey(addOn)) {
      entitled.add(addOn);
    }
  }
  return entitled;
}

export function hasFeature(entitled: Set<FeatureKey>, key: FeatureKey): boolean {
  return entitled.has(key);
}
