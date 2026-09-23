import { Badge } from "@/ui/shadcn/components/badge";
import { cn } from "@/ui/shadcn/lib/utils";

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

const SQUARE_COLOR: Record<LegendVariant, string> = {
  default: "bg-muted-foreground/40",
  started: "bg-primary",
  done: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

/**
 * Reference §03: "Status-Quadrat links je Task (Workflow-Status-Farbe)" — a
 * compact color indicator for row-dense contexts (task title, board cards),
 * distinct from the full `LegendKey` pill used in column cells and group
 * headers where a text label is wanted too.
 */
export function StatusSquare({ variant, category, className }: { variant?: LegendVariant; category?: string; className?: string }) {
  const resolved = variant ?? (category ? (CATEGORY_VARIANT[category] ?? "default") : "default");
  return <span aria-hidden="true" className={cn("inline-block size-2.5 shrink-0 rounded-[2px]", SQUARE_COLOR[resolved], className)} />;
}

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
