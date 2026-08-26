import { describe, expect, it } from "vitest";
import { computePendingLoginExpiry, isPendingLoginValid } from "../src/tenant/auth/pendingLogin";

describe("computePendingLoginExpiry / isPendingLoginValid", () => {
  it("is valid immediately after creation", () => {
    const now = new Date("2026-08-26T10:00:00.000Z");
    const expiresAt = computePendingLoginExpiry(now);
    expect(isPendingLoginValid(expiresAt, now)).toBe(true);
  });

  it("is still valid just before expiry", () => {
    const now = new Date("2026-08-26T10:00:00.000Z");
    const expiresAt = computePendingLoginExpiry(now);
    expect(isPendingLoginValid(expiresAt, new Date(expiresAt.getTime() - 1000))).toBe(true);
  });

  it("is invalid after expiry", () => {
    const now = new Date("2026-08-26T10:00:00.000Z");
    const expiresAt = computePendingLoginExpiry(now);
    expect(isPendingLoginValid(expiresAt, new Date(expiresAt.getTime() + 1000))).toBe(false);
  });
});
