"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/ui/shadcn/components/button";

export type SortDirection = "asc" | "desc";

/** Small icon toggle for a list's sort direction, paired with a "Sort: <field>" dropdown. */
export function SortDirectionButton({ direction, onToggle }: { direction: SortDirection; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="h-9 w-9"
      onClick={onToggle}
      aria-label={direction === "asc" ? "Aufsteigend sortiert — zu absteigend wechseln" : "Absteigend sortiert — zu aufsteigend wechseln"}
      title={direction === "asc" ? "Aufsteigend" : "Absteigend"}
    >
      {direction === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
    </Button>
  );
}
