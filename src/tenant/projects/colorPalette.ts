export const PROJECT_COLOR_PALETTE = [
  "#5B8DEF",
  "#E5484D",
  "#F5A524",
  "#12B76A",
  "#7C3AED",
  "#0EA5E9",
  "#EC4899",
  "#64748B",
  "#B45309",
] as const;

export function isValidProjectColor(value: string): boolean {
  return (PROJECT_COLOR_PALETTE as readonly string[]).includes(value);
}
