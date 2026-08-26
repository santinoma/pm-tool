import { describe, expect, it } from "vitest";
import {
  buildInviteUrl,
  computeInviteExpiry,
  generateInviteToken,
  isInviteValid,
} from "../src/tenant/auth/invite";

describe("generateInviteToken", () => {
  it("generates a long, unique token each time", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});

describe("computeInviteExpiry", () => {
  it("computes an expiry 7 days after the given date", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const expiry = computeInviteExpiry(from);
    expect(expiry.toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });
});

describe("isInviteValid", () => {
  const now = new Date("2026-01-05T00:00:00Z");

  it("accepts an invite that is neither expired nor accepted", () => {
    const result = isInviteValid(
      { expiresAt: new Date("2026-01-10T00:00:00Z"), acceptedAt: null },
      now,
    );
    expect(result.valid).toBe(true);
  });

  it("rejects an expired invite", () => {
    const result = isInviteValid(
      { expiresAt: new Date("2026-01-01T00:00:00Z"), acceptedAt: null },
      now,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("rejects an already-accepted invite", () => {
    const result = isInviteValid(
      {
        expiresAt: new Date("2026-01-10T00:00:00Z"),
        acceptedAt: new Date("2026-01-02T00:00:00Z"),
      },
      now,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("already-accepted");
  });
});

describe("buildInviteUrl", () => {
  it("uses http for localhost", () => {
    expect(buildInviteUrl("localhost", "kunde", "abc123")).toBe(
      "http://kunde.localhost/accept-invite/abc123",
    );
  });

  it("uses https for a real domain", () => {
    expect(buildInviteUrl("dein-tool.de", "kunde", "abc123")).toBe(
      "https://kunde.dein-tool.de/accept-invite/abc123",
    );
  });
});
