/**
 * Whether a newly created task should start in Triage. Kept as its own
 * function (not inlined in the route) so the decision is documented and
 * unit-testable in one place, even though it is currently a passthrough.
 */
export function resolveInitialTriageState(triageEnabled: boolean): boolean {
  return triageEnabled;
}
