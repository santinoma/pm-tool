import { Badge } from "@/ui/shadcn/components/badge";

type LegendVariant = "default" | "started" | "done" | "warning" | "danger";

const CATEGORY_VARIANT: Record<string, LegendVariant> = {
  not_started: "default",
  started: "started",
  done: "done",
};

const BADGE_VARIANT: Record<LegendVariant, "outline" | "primaryOutline" | "successOutline" | "warningOutline" | "destructiveOutline"> = {
  default: "outline",
  started: "primaryOutline",
  done: "successOutline",
  warning: "warningOutline",
  danger: "destructiveOutline",
};

export function LegendKey({
  label,
  variant,
  category,
}: {
  label: string;
  variant?: LegendVariant;
  category?: string;
}) {
  const resolved = variant ?? (category ? (CATEGORY_VARIANT[category] ?? "default") : "default");
  return <Badge variant={BADGE_VARIANT[resolved]}>{label}</Badge>;
}
