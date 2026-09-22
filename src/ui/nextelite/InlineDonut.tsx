import { cn } from "@/ui/shadcn/lib/utils";
import { ragVariantForUsagePercent, type RagVariant } from "./ragVariant";

const STROKE_VARIANT: Record<RagVariant, string> = {
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
};

/**
 * Reference §05: "Inline-Donut (Ist/Budget)" — a small, table-cell-sized
 * ring chart encoding a usage/actual-vs-budget percentage, RAG-colored.
 * Referenced by a pre-existing code comment in ReportBuilderClient.tsx
 * ("dieselbe Palette wie Inline-Donuts der Listen") that had nothing to
 * point to until this component existed (T504).
 */
export function InlineDonut({
  percent,
  size = 22,
  strokeWidth = 3,
  warnAt = 80,
  className,
  title,
}: {
  /** 0-100+ (values over 100 render as a full ring in the destructive color). */
  percent: number;
  size?: number;
  strokeWidth?: number;
  warnAt?: number;
  className?: string;
  title?: string;
}) {
  const variant = ragVariantForUsagePercent(percent, warnAt);
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const label = title ?? `${Math.round(percent)}%`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("-rotate-90 shrink-0", className)}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <circle cx={size / 2} cy={size / 2} r={radius} className="stroke-muted/40" strokeWidth={strokeWidth} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        className={STROKE_VARIANT[variant]}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}
