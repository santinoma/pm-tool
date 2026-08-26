import { describe, expect, it } from "vitest";
import { isAllowedForClient } from "../src/proxy";

describe("isAllowedForClient", () => {
  it("allows the portal and its nested routes", () => {
    expect(isAllowedForClient("/portal")).toBe(true);
    expect(isAllowedForClient("/portal/some-project-id")).toBe(true);
  });

  it("allows login, accept-invite and their APIs", () => {
    expect(isAllowedForClient("/login")).toBe(true);
    expect(isAllowedForClient("/accept-invite/some-token")).toBe(true);
    expect(isAllowedForClient("/api/tenant/login")).toBe(true);
    expect(isAllowedForClient("/api/tenant/logout")).toBe(true);
    expect(isAllowedForClient("/api/tenant/invites/some-token/accept")).toBe(true);
  });

  it("blocks internal tenant pages", () => {
    expect(isAllowedForClient("/dashboard")).toBe(false);
    expect(isAllowedForClient("/projects")).toBe(false);
    expect(isAllowedForClient("/settings/organization")).toBe(false);
    expect(isAllowedForClient("/financials")).toBe(false);
  });
});
