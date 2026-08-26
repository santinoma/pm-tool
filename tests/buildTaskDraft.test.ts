import { describe, expect, it } from "vitest";
import { buildTaskDraft } from "../src/tenant/slackCapture/buildTaskDraft";

describe("buildTaskDraft", () => {
  it("uses the first line of the text as the title", () => {
    const draft = buildTaskDraft({
      text: "Can we get a dark mode toggle?\nWould help a lot for late-night use.",
      userName: "jane",
      channelName: "feature-requests",
      permalink: "https://example.slack.com/archives/C1/p123",
    });
    expect(draft.title).toBe("Can we get a dark mode toggle?");
  });

  it("includes the full text and a source line in the description", () => {
    const draft = buildTaskDraft({
      text: "Please fix the export bug.",
      userName: "jane",
      channelName: "bugs",
      permalink: "https://example.slack.com/archives/C1/p123",
    });
    expect(draft.description).toContain("Please fix the export bug.");
    expect(draft.description).toContain("Quelle: Slack (#bugs), von @jane");
    expect(draft.description).toContain("https://example.slack.com/archives/C1/p123");
  });

  it("sets externalSourceUrl to the permalink", () => {
    const draft = buildTaskDraft({
      text: "x",
      userName: "jane",
      channelName: "bugs",
      permalink: "https://example.slack.com/archives/C1/p123",
    });
    expect(draft.externalSourceUrl).toBe("https://example.slack.com/archives/C1/p123");
  });

  it("truncates an overly long first line for the title", () => {
    const longLine = "a".repeat(200);
    const draft = buildTaskDraft({
      text: longLine,
      userName: "jane",
      channelName: "bugs",
      permalink: "https://example.slack.com/archives/C1/p123",
    });
    expect(draft.title.length).toBeLessThanOrEqual(120);
    expect(draft.title.endsWith("…")).toBe(true);
  });

  it("falls back to a default title for empty text", () => {
    const draft = buildTaskDraft({
      text: "",
      userName: "jane",
      channelName: "bugs",
      permalink: "https://example.slack.com/archives/C1/p123",
    });
    expect(draft.title).toBe("Slack-Ask");
  });
});
