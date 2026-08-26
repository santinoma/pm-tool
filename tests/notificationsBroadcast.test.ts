import { describe, expect, it } from "vitest";
import { hasBroadcastMention } from "../src/tenant/notifications/broadcast";

describe("hasBroadcastMention", () => {
  it("detects @channel as a standalone word", () => {
    expect(hasBroadcastMention("hey @channel please look at this")).toBe(true);
  });

  it("detects @channel at the start or end of the text", () => {
    expect(hasBroadcastMention("@channel")).toBe(true);
    expect(hasBroadcastMention("done, @channel")).toBe(true);
  });

  it("does not treat an email containing 'channel' as a broadcast", () => {
    expect(hasBroadcastMention("cc foo@channel.com")).toBe(false);
  });

  it("does not match when @channel is part of a longer token", () => {
    expect(hasBroadcastMention("@channel-updates")).toBe(false);
    expect(hasBroadcastMention("something@channel")).toBe(false);
  });

  it("returns false when there is no mention at all", () => {
    expect(hasBroadcastMention("just a normal comment")).toBe(false);
  });
});
