import { describe, expect, it } from "vitest";
import { shouldNotify } from "../src/tenant/notifications/fanout";

describe("shouldNotify", () => {
  it("never notifies the actor themselves, regardless of level or mentions", () => {
    expect(shouldNotify("all", true, true, true)).toBe(false);
  });

  it("'all' notifies for any event by another user", () => {
    expect(shouldNotify("all", false, false, false)).toBe(true);
  });

  it("'mentions' does not notify for a plain event", () => {
    expect(shouldNotify("mentions", false, false, false)).toBe(false);
  });

  it("'mentions' notifies for an individual mention", () => {
    expect(shouldNotify("mentions", false, true, false)).toBe(true);
  });

  it("'mentions' notifies for a broadcast mention", () => {
    expect(shouldNotify("mentions", false, false, true)).toBe(true);
  });

  it("'off' never notifies, even with an individual or broadcast mention", () => {
    expect(shouldNotify("off", false, true, false)).toBe(false);
    expect(shouldNotify("off", false, false, true)).toBe(false);
  });
});
