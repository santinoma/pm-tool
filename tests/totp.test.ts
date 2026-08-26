import { describe, expect, it } from "vitest";
import { computeTotpCode, verifyTotpCode, generateTotpSecret, buildOtpAuthUri } from "../src/tenant/auth/totp";

// RFC 6238 Appendix B test vectors use the ASCII secret "12345678901234567890",
// base32-encoded below, with 8-digit codes — a 6-digit code is the last 6 digits
// of the 8-digit one, since code = binary % 10^d and 10^6 divides 10^8.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("computeTotpCode", () => {
  it("matches the RFC 6238 test vector for T=59s (8-digit 94287082 -> 287082)", () => {
    expect(computeTotpCode(RFC_SECRET, 59_000)).toBe("287082");
  });

  it("matches the RFC 6238 test vector for T=1111111109s (8-digit 07081804 -> 081804)", () => {
    expect(computeTotpCode(RFC_SECRET, 1_111_111_109_000)).toBe("081804");
  });

  it("produces a different code for a different time step", () => {
    const code1 = computeTotpCode(RFC_SECRET, 59_000);
    const code2 = computeTotpCode(RFC_SECRET, 1_111_111_109_000);
    expect(code1).not.toBe(code2);
  });
});

describe("verifyTotpCode", () => {
  it("accepts the exact current code", () => {
    expect(verifyTotpCode(RFC_SECRET, "287082", 59_000)).toBe(true);
  });

  it("rejects a wrong code", () => {
    expect(verifyTotpCode(RFC_SECRET, "000000", 59_000)).toBe(false);
  });

  it("tolerates one 30s step of clock drift in either direction", () => {
    const codeAtNextStep = computeTotpCode(RFC_SECRET, 59_000 + 30_000);
    expect(verifyTotpCode(RFC_SECRET, codeAtNextStep, 59_000)).toBe(true);
  });

  it("rejects a code two steps away", () => {
    const codeTwoStepsAhead = computeTotpCode(RFC_SECRET, 59_000 + 60_000);
    expect(verifyTotpCode(RFC_SECRET, codeTwoStepsAhead, 59_000)).toBe(false);
  });
});

describe("generateTotpSecret / buildOtpAuthUri", () => {
  it("generates a base32 secret usable to compute a code", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(() => computeTotpCode(secret)).not.toThrow();
  });

  it("builds a well-formed otpauth:// URI", () => {
    const uri = buildOtpAuthUri("SECRET123", "user@example.com", "PM-Atlas");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("secret=SECRET123");
    expect(uri).toContain("issuer=PM-Atlas");
  });
});
