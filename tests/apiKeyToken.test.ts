import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKeyToken } from "../src/tenant/apiKeys/apiKeyToken";

describe("generateApiKey", () => {
  it("generates a token with the expected prefix", () => {
    const { token } = generateApiKey();
    expect(token.startsWith("pmtool_")).toBe(true);
  });

  it("generates distinct tokens on repeated calls", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it("returns a tokenHash that matches hashApiKeyToken(token)", () => {
    const { token, tokenHash } = generateApiKey();
    expect(hashApiKeyToken(token)).toBe(tokenHash);
  });

  it("returns a tokenPrefix that is a prefix of the full token", () => {
    const { token, tokenPrefix } = generateApiKey();
    expect(token.startsWith(tokenPrefix)).toBe(true);
    expect(tokenPrefix.length).toBeLessThan(token.length);
  });
});

describe("hashApiKeyToken", () => {
  it("is deterministic for the same input", () => {
    expect(hashApiKeyToken("same-token")).toBe(hashApiKeyToken("same-token"));
  });

  it("produces different hashes for different tokens", () => {
    expect(hashApiKeyToken("token-a")).not.toBe(hashApiKeyToken("token-b"));
  });
});
