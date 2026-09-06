import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../src/tenant/apiKeys/rateLimit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit within a window", () => {
    const keyId = `key-${Math.random()}`;
    let now = 1_000_000;
    for (let i = 0; i < 100; i++) {
      const result = checkRateLimit(keyId, () => now);
      expect(result.allowed).toBe(true);
    }
  });

  it("rejects the 101st request within the same window", () => {
    const keyId = `key-${Math.random()}`;
    let now = 1_000_000;
    for (let i = 0; i < 100; i++) {
      checkRateLimit(keyId, () => now);
    }
    const result = checkRateLimit(keyId, () => now);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the window after WINDOW_MS elapses", () => {
    const keyId = `key-${Math.random()}`;
    let now = 1_000_000;
    for (let i = 0; i < 100; i++) {
      checkRateLimit(keyId, () => now);
    }
    expect(checkRateLimit(keyId, () => now).allowed).toBe(false);

    now += 10_000; // exactly one window later
    const result = checkRateLimit(keyId, () => now);
    expect(result.allowed).toBe(true);
  });

  it("tracks separate windows per api key", () => {
    let now = 2_000_000;
    const keyA = `key-a-${Math.random()}`;
    const keyB = `key-b-${Math.random()}`;
    for (let i = 0; i < 100; i++) {
      checkRateLimit(keyA, () => now);
    }
    expect(checkRateLimit(keyA, () => now).allowed).toBe(false);
    expect(checkRateLimit(keyB, () => now).allowed).toBe(true);
  });

  it("computes a sensible retryAfterSeconds close to the remaining window time", () => {
    const keyId = `key-${Math.random()}`;
    let now = 5_000_000;
    for (let i = 0; i < 100; i++) {
      checkRateLimit(keyId, () => now);
    }
    now += 4_000; // 4s into the 10s window
    const result = checkRateLimit(keyId, () => now);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(6);
  });
});
