import type { RoleName } from "./roleGuard";

export type EmploymentTypeName = "employee" | "contractor";

/**
 * T315 (Productive "Employees vs. Contractors"): Contractors haben laut
 * Doku-Vergleichstabelle keine Rollen-Stufen — sie können nie Admin oder
 * Owner sein, nur genau EIN festes Berechtigungsprofil (hier: `member`).
 */
export function isRoleAllowedForEmploymentType(role: RoleName, employmentType: EmploymentTypeName): boolean {
  if (employmentType === "contractor" && (role === "owner" || role === "admin")) {
    return false;
  }
  return true;
}

/**
 * Contractors bekommen laut Doku "one default permission set" statt
 * mehrerer wählbarer Stufen — eine zusätzliche Custom Role würde genau das
 * unterlaufen, daher bleibt ihnen nur das Legacy-`member`-Berechtigungsprofil.
 */
export function isCustomRoleAllowedForEmploymentType(employmentType: EmploymentTypeName): boolean {
  return employmentType !== "contractor";
}
