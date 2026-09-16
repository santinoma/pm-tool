"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";

import { cn } from "@/ui/shadcn/lib/utils";

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  variant?: "default" | "success" | "warning" | "destructive";
};

// Reference "RAG-Semantik ... getrennt vom Marken-Akzent (Violett)": track and
// indicator both switch to the RAG token, not just the indicator, so a
// destructive/success/warning bar never reads as a tinted version of the
// brand accent.
const TRACK_VARIANT: Record<NonNullable<ProgressProps["variant"]>, string> = {
  default: "bg-primary/20",
  success: "bg-success/20",
  warning: "bg-warning/20",
  destructive: "bg-destructive/20",
};

const INDICATOR_VARIANT: Record<NonNullable<ProgressProps["variant"]>, string> = {
  default: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

function Progress({ className, variant = "default", value, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("relative h-6 w-full overflow-hidden rounded-full", TRACK_VARIANT[variant], className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 rounded-full transition-all", INDICATOR_VARIANT[variant])}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
