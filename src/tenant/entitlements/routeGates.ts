import type { FeatureKey } from "./features";

interface RouteGate {
  pattern: RegExp;
  feature: FeatureKey;
}

const ROUTE_GATES: RouteGate[] = [
  // budgets_financials
  { pattern: /^\/financials(\/.*)?$/, feature: "budgets_financials" },
  { pattern: /^\/projects\/[^/]+\/budget(\/.*)?$/, feature: "budgets_financials" },
  { pattern: /^\/api\/tenant\/projects\/[^/]+\/budget(\/.*)?$/, feature: "budgets_financials" },
  { pattern: /^\/api\/tenant\/budgets(\/.*)?$/, feature: "budgets_financials" },
  { pattern: /^\/api\/tenant\/budget-sections(\/.*)?$/, feature: "budgets_financials" },
  { pattern: /^\/api\/tenant\/invoices(\/.*)?$/, feature: "budgets_financials" },
  { pattern: /^\/api\/tenant\/users\/[^/]+\/cost-rate$/, feature: "budgets_financials" },
  { pattern: /^\/api\/tenant\/financials(\/.*)?$/, feature: "budgets_financials" },

  // cycles_sprints
  { pattern: /^\/projects\/[^/]+\/cycles(\/.*)?$/, feature: "cycles_sprints" },
  { pattern: /^\/api\/tenant\/projects\/[^/]+\/cycles(\/.*)?$/, feature: "cycles_sprints" },
  { pattern: /^\/api\/tenant\/cycles(\/.*)?$/, feature: "cycles_sprints" },

  // automation_rules
  { pattern: /^\/settings\/organization\/automations(\/.*)?$/, feature: "automation_rules" },
  { pattern: /^\/api\/tenant\/automation-rules(\/.*)?$/, feature: "automation_rules" },

  // workflow_transition_rules (API only — the workflow settings page also hosts core status editing)
  { pattern: /^\/api\/tenant\/projects\/[^/]+\/transition-rules(\/.*)?$/, feature: "workflow_transition_rules" },

  // client_portal
  { pattern: /^\/portal(\/.*)?$/, feature: "client_portal" },

  // shared_views (the public /shared/[token] viewer stays ungated on purpose)
  { pattern: /^\/api\/tenant\/projects\/[^/]+\/shared-views(\/.*)?$/, feature: "shared_views" },
  { pattern: /^\/api\/tenant\/shared-views(\/.*)?$/, feature: "shared_views" },

  // cross_board_relations
  { pattern: /^\/api\/tenant\/tasks\/[^/]+\/links(\/.*)?$/, feature: "cross_board_relations" },
  { pattern: /^\/api\/tenant\/tasks\/search$/, feature: "cross_board_relations" },

  // integrations_marketplace
  { pattern: /^\/settings\/organization\/integrations(\/.*)?$/, feature: "integrations_marketplace" },
  { pattern: /^\/api\/tenant\/api-keys(\/.*)?$/, feature: "integrations_marketplace" },
  { pattern: /^\/api\/tenant\/integrations$/, feature: "integrations_marketplace" },
  { pattern: /^\/api\/v1(\/.*)?$/, feature: "integrations_marketplace" },

  // slack_capture
  { pattern: /^\/api\/tenant\/organization\/slack-capture(\/.*)?$/, feature: "slack_capture" },
  { pattern: /^\/api\/tenant\/integrations\/slack(\/.*)?$/, feature: "slack_capture" },

  // two_factor_scim
  { pattern: /^\/api\/tenant\/2fa(\/.*)?$/, feature: "two_factor_scim" },
  { pattern: /^\/api\/tenant\/login\/2fa$/, feature: "two_factor_scim" },
  { pattern: /^\/api\/tenant\/organization\/scim-token(\/.*)?$/, feature: "two_factor_scim" },
  { pattern: /^\/scim(\/.*)?$/, feature: "two_factor_scim" },

  // portfolios_goals
  { pattern: /^\/portfolios(\/.*)?$/, feature: "portfolios_goals" },
  { pattern: /^\/api\/tenant\/portfolios(\/.*)?$/, feature: "portfolios_goals" },
  { pattern: /^\/api\/tenant\/goals(\/.*)?$/, feature: "portfolios_goals" },

  // baseline_diffing
  { pattern: /^\/projects\/[^/]+\/baselines(\/.*)?$/, feature: "baseline_diffing" },
  { pattern: /^\/api\/tenant\/projects\/[^/]+\/baselines(\/.*)?$/, feature: "baseline_diffing" },
  { pattern: /^\/api\/tenant\/baselines(\/.*)?$/, feature: "baseline_diffing" },

  // custom_roles
  { pattern: /^\/settings\/organization\/roles(\/.*)?$/, feature: "custom_roles" },
  { pattern: /^\/api\/tenant\/roles(\/.*)?$/, feature: "custom_roles" },
  { pattern: /^\/api\/tenant\/users\/[^/]+\/custom-role$/, feature: "custom_roles" },

  // project_role_overrides
  { pattern: /^\/api\/tenant\/projects\/[^/]+\/role-overrides(\/.*)?$/, feature: "project_role_overrides" },
];

/**
 * Gibt den ersten fehlenden Feature-Key für einen Pfad zurück, oder null wenn
 * der Pfad entweder ungegatet ist oder alle zutreffenden Gates erfüllt sind.
 */
export function resolveMissingFeature(pathname: string, entitled: Set<FeatureKey>): FeatureKey | null {
  for (const gate of ROUTE_GATES) {
    if (gate.pattern.test(pathname) && !entitled.has(gate.feature)) {
      return gate.feature;
    }
  }
  return null;
}
