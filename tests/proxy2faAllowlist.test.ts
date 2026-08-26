import { describe, expect, it } from "vitest";
import { isAllowedDuring2faSetup } from "../src/proxy";

describe("isAllowedDuring2faSetup", () => {
  it("allows the security settings page and its nested routes", () => {
    expect(isAllowedDuring2faSetup("/settings/security")).toBe(true);
  });

  it("allows the 2fa enroll/verify APIs and login/logout", () => {
    expect(isAllowedDuring2faSetup("/api/tenant/2fa/enroll")).toBe(true);
    expect(isAllowedDuring2faSetup("/api/tenant/2fa/verify")).toBe(true);
    expect(isAllowedDuring2faSetup("/login")).toBe(true);
    expect(isAllowedDuring2faSetup("/api/tenant/logout")).toBe(true);
  });

  it("blocks other internal pages", () => {
    expect(isAllowedDuring2faSetup("/dashboard")).toBe(false);
    expect(isAllowedDuring2faSetup("/settings/organization")).toBe(false);
    expect(isAllowedDuring2faSetup("/projects")).toBe(false);
  });
});
