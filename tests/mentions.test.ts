import { describe, expect, it } from "vitest";
import { extractMentionedEmails } from "../src/tenant/collaboration/mentions";

describe("extractMentionedEmails", () => {
  it("extracts a single mention", () => {
    expect(extractMentionedEmails("Hey @alice@example.com, please review")).toEqual([
      "alice@example.com",
    ]);
  });

  it("extracts multiple distinct mentions", () => {
    const result = extractMentionedEmails("cc @alice@example.com and @bob@example.com");
    expect(result).toEqual(["alice@example.com", "bob@example.com"]);
  });

  it("deduplicates repeated mentions", () => {
    const result = extractMentionedEmails("@alice@example.com ... @alice@example.com again");
    expect(result).toEqual(["alice@example.com"]);
  });

  it("returns an empty array when there are no mentions", () => {
    expect(extractMentionedEmails("no mentions here")).toEqual([]);
  });

  it("ignores malformed @-patterns that are not valid emails", () => {
    expect(extractMentionedEmails("@notanemail and @also-not-one")).toEqual([]);
  });
});
