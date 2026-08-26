import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE_NAME,
  buildExpiredSessionCookie,
  buildSessionCookie,
  computeSessionExpiry,
  isSessionExpired,
} from "../src/tenant/auth/session";

describe("computeSessionExpiry", () => {
  it("computes an expiry 7 days after the given date", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(computeSessionExpiry(from).toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });
});

describe("isSessionExpired", () => {
  const now = new Date("2026-01-05T00:00:00Z");

  it("returns false for a session that has not expired", () => {
    expect(isSessionExpired({ expiresAt: new Date("2026-01-10T00:00:00Z") }, now)).toBe(false);
  });

  it("returns true for a session in the past", () => {
    expect(isSessionExpired({ expiresAt: new Date("2026-01-01T00:00:00Z") }, now)).toBe(true);
  });
});

describe("buildSessionCookie", () => {
  it("builds an httpOnly, sameSite=lax cookie with no domain attribute", () => {
    const expiresAt = new Date("2026-01-08T00:00:00Z");
    const cookie = buildSessionCookie("session-123", expiresAt, { secure: true });

    expect(cookie.name).toBe(SESSION_COOKIE_NAME);
    expect(cookie.value).toBe("session-123");
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("lax");
    expect(cookie.secure).toBe(true);
    expect(cookie.expires).toEqual(expiresAt);
    expect(cookie).not.toHaveProperty("domain");
  });
});

describe("buildExpiredSessionCookie", () => {
  it("builds a cookie with an empty value and a past expiry", () => {
    const cookie = buildExpiredSessionCookie({ secure: true });
    expect(cookie.value).toBe("");
    expect(cookie.expires.getTime()).toBeLessThan(Date.now());
  });
});
