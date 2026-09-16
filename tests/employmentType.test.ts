import { describe, expect, it } from "vitest";
import { isCustomRoleAllowedForEmploymentType, isRoleAllowedForEmploymentType } from "../src/tenant/auth/employmentType";

describe("isRoleAllowedForEmploymentType (T315)", () => {
  it("allows any role for employees", () => {
    expect(isRoleAllowedForEmploymentType("owner", "employee")).toBe(true);
    expect(isRoleAllowedForEmploymentType("admin", "employee")).toBe(true);
    expect(isRoleAllowedForEmploymentType("member", "employee")).toBe(true);
  });

  it("rejects owner/admin for contractors", () => {
    expect(isRoleAllowedForEmploymentType("owner", "contractor")).toBe(false);
    expect(isRoleAllowedForEmploymentType("admin", "contractor")).toBe(false);
  });

  it("allows member for contractors (their one fixed profile)", () => {
    expect(isRoleAllowedForEmploymentType("member", "contractor")).toBe(true);
  });
});

describe("isCustomRoleAllowedForEmploymentType (T315)", () => {
  it("allows custom roles for employees", () => {
    expect(isCustomRoleAllowedForEmploymentType("employee")).toBe(true);
  });

  it("rejects custom roles for contractors", () => {
    expect(isCustomRoleAllowedForEmploymentType("contractor")).toBe(false);
  });
});
