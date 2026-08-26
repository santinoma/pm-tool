import { describe, expect, it } from "vitest";
import { isSharedViewValid } from "../src/tenant/sharedViews/sharedViewAccess";

describe("isSharedViewValid", () => {
  it("is valid when neither revoked nor expired", () => {
    const result = isSharedViewValid({ revokedAt: null, expiresAt: null });
    expect(result.valid).toBe(true);
  });

  it("is invalid once revoked", () => {
    const result = isSharedViewValid({ revokedAt: new Date("2026-01-01"), expiresAt: null });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("revoked");
  });

  it("is invalid once past its expiry date", () => {
    const now = new Date("2026-08-26");
    const result = isSharedViewValid({ revokedAt: null, expiresAt: new Date("2026-08-01") }, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("is valid before its expiry date", () => {
    const now = new Date("2026-08-01");
    const result = isSharedViewValid({ revokedAt: null, expiresAt: new Date("2026-08-26") }, now);
    expect(result.valid).toBe(true);
  });

  it("reports revoked over expired when both apply", () => {
    const now = new Date("2026-08-26");
    const result = isSharedViewValid(
      { revokedAt: new Date("2026-08-10"), expiresAt: new Date("2026-08-01") },
      now,
    );
    expect(result.reason).toBe("revoked");
  });
});
