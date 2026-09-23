import { Badge } from "@/ui/shadcn/components/badge";

const PRIORITY_VARIANT: Record<string, "outline" | "warningOutline" | "destructiveOutline"> = {
  Urgent: "destructiveOutline",
  High: "warningOutline",
};

/** Reference §03: "Tags/Chips: ... Priority (High/…) ... als farbige Pills." */
export function PriorityPill({ value }: { value: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={PRIORITY_VARIANT[value] ?? "outline"}>{value}</Badge>;
}
