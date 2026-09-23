export type RagVariant = "success" | "warning" | "destructive";

/**
 * Reference §05 "Datenvisualisierung & Farbsemantik": usage/exhaustion bars
 * are three-state RAG ("im Rahmen / nähert sich / überschritten"), not just
 * a green/red cutoff at 100%. Shared here so every Progress/InlineDonut
 * usage indicator in the app applies the same threshold instead of each
 * call site hand-rolling its own two-state variant.
 */
export function ragVariantForUsagePercent(percent: number, warnAt = 80): RagVariant {
  if (percent > 100) return "destructive";
  if (percent >= warnAt) return "warning";
  return "success";
}
