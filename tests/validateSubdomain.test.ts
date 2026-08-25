import { describe, expect, it } from "vitest";
import { validateSubdomain } from "../src/platform/validateSubdomain";

describe("validateSubdomain", () => {
  it("accepts a valid subdomain", () => {
    expect(validateSubdomain("kunde-eins").valid).toBe(true);
    expect(validateSubdomain("abc").valid).toBe(true);
    expect(validateSubdomain("kunde123").valid).toBe(true);
  });

  it("rejects subdomains that are too short", () => {
    const result = validateSubdomain("ab");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/lang/);
  });

  it("rejects uppercase letters", () => {
    const result = validateSubdomain("Kunde");
    expect(result.valid).toBe(false);
  });

  it("rejects special characters", () => {
    expect(validateSubdomain("kunde_eins").valid).toBe(false);
    expect(validateSubdomain("kunde.eins").valid).toBe(false);
    expect(validateSubdomain("kunde eins").valid).toBe(false);
  });

  it("rejects leading or trailing hyphens", () => {
    expect(validateSubdomain("-kunde").valid).toBe(false);
    expect(validateSubdomain("kunde-").valid).toBe(false);
  });

  it("rejects reserved subdomains", () => {
    const result = validateSubdomain("admin");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/reserviert/);
  });

  it("rejects subdomains longer than 63 characters", () => {
    const tooLong = "a".repeat(64);
    expect(validateSubdomain(tooLong).valid).toBe(false);
  });
});
