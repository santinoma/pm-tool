import type { ComponentProps } from "react";

import { TableCell } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

type NumericFormat = "currency" | "hours" | "percent" | "number";

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function formatValue(value: number, format: NumericFormat, decimals?: number): string {
  switch (format) {
    case "currency":
      return decimals !== undefined
        ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: decimals }).format(value)
        : CURRENCY_FORMATTER.format(value);
    case "hours":
      return `${value.toFixed(decimals ?? 2)}h`;
    case "percent":
      return `${value.toFixed(decimals ?? 0)}%`;
    case "number":
    default:
      return value.toFixed(decimals ?? 2);
  }
}

// Reference "Data / Labels" token: numeric table cells are right-aligned,
// mono-spaced, and negative values render in the destructive/RAG red —
// this collapses the ad hoc per-call-site className into one primitive.
// `tabular-nums` itself already comes for free from the base TableCell.
export function NumericCell({
  value,
  format = "number",
  decimals,
  emptyFallback = "—",
  className,
  ...props
}: {
  value: number | null | undefined;
  format?: NumericFormat;
  decimals?: number;
  emptyFallback?: React.ReactNode;
} & Omit<ComponentProps<typeof TableCell>, "children">) {
  return (
    <TableCell className={cn("text-right font-mono", className, value != null && value < 0 && "text-destructive")} {...props}>
      {value != null ? formatValue(value, format, decimals) : emptyFallback}
    </TableCell>
  );
}
