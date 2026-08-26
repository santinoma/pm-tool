import { describe, expect, it } from "vitest";
import { signPayload } from "../src/tenant/webhooks/signature";

describe("signPayload", () => {
  it("produces the same signature for the same body and secret", () => {
    const a = signPayload('{"foo":"bar"}', "secret1");
    const b = signPayload('{"foo":"bar"}', "secret1");
    expect(a).toBe(b);
  });

  it("produces a different signature for a different secret", () => {
    const a = signPayload('{"foo":"bar"}', "secret1");
    const b = signPayload('{"foo":"bar"}', "secret2");
    expect(a).not.toBe(b);
  });

  it("produces a different signature for a different body", () => {
    const a = signPayload('{"foo":"bar"}', "secret1");
    const b = signPayload('{"foo":"baz"}', "secret1");
    expect(a).not.toBe(b);
  });

  it("returns a hex string", () => {
    const signature = signPayload("body", "secret");
    expect(signature).toMatch(/^[0-9a-f]+$/);
  });
});
