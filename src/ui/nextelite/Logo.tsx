import { cn } from "@/ui/shadcn/lib/utils";

/**
 * Wordmark-only brand mark. Boldonse (`--font-boldonse`, registered in
 * `src/app/layout.tsx`) is display-only at weight 400 — no italic/bold
 * variants, so don't stack font-weight utilities on it.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-boldonse lowercase tracking-tight text-foreground", className)}
      style={{ fontFamily: "var(--font-boldonse)" }}
    >
      ardento
    </span>
  );
}
