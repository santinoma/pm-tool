type LegendVariant = "default" | "started" | "done" | "warning" | "danger";

const CATEGORY_VARIANT: Record<string, LegendVariant> = {
  not_started: "default",
  started: "started",
  done: "done",
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
  const resolved = variant ?? (category ? CATEGORY_VARIANT[category] ?? "default" : "default");
  const className = resolved === "default" ? "legend-key" : `legend-key legend-key--${resolved}`;
  return (
    <span className={className}>
      <span className="legend-swatch" />
      {label}
    </span>
  );
}
