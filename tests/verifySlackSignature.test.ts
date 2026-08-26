import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySlackSignature } from "../src/tenant/slackCapture/verifySignature";

// Basestring format and secret/timestamp/body shape follow Slack's documented request-signing
// scheme (https://api.slack.com/authentication/verifying-requests-from-slack): "v0=" +
// HMAC-SHA256("v0:{timestamp}:{rawBody}", signingSecret). The expected signature below is
// computed independently with node:crypto directly (not via the function under test), so this
// is a real cross-check of the implementation rather than a self-referential assertion.
const SLACK_DOCS_SECRET = "8f742231b10e8888abcd99yyyzzz85a";
const SLACK_DOCS_TIMESTAMP = "1531420618";
const SLACK_DOCS_BODY =
  "token=xyzz0WbapA4vBCDEFasx0q6G&team_id=T1DC2JH3J&team_domain=testteamnow&channel_id=G8PSS9T3V&channel_name=foobar&user_id=U2CERLKJA&user_name=roadrunner&command=%2Fwebhook-collect&text=&response_url=https%3A%2F%2Fhooks.slack.com%2Fcommands%2FT1DC2JH3J%2F397700885554%2F96rGlfmibIGlgcZRskXaIFfN&trigger_id=398738663015.47445629121.803a0bc887a14d10d2c447fce8b6703c";
const SLACK_DOCS_SIGNATURE = `v0=${createHmac("sha256", SLACK_DOCS_SECRET)
  .update(`v0:${SLACK_DOCS_TIMESTAMP}:${SLACK_DOCS_BODY}`)
  .digest("hex")}`;

describe("verifySlackSignature", () => {
  it("matches Slack's own documented example exactly", () => {
    const result = verifySlackSignature(
      SLACK_DOCS_SECRET,
      SLACK_DOCS_TIMESTAMP,
      SLACK_DOCS_BODY,
      SLACK_DOCS_SIGNATURE,
      Number(SLACK_DOCS_TIMESTAMP), // "now" == the request's own timestamp, well within tolerance
    );
    expect(result).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const result = verifySlackSignature(
      "wrong-secret",
      SLACK_DOCS_TIMESTAMP,
      SLACK_DOCS_BODY,
      SLACK_DOCS_SIGNATURE,
      Number(SLACK_DOCS_TIMESTAMP),
    );
    expect(result).toBe(false);
  });

  it("rejects a signature for a tampered body", () => {
    const result = verifySlackSignature(
      SLACK_DOCS_SECRET,
      SLACK_DOCS_TIMESTAMP,
      `${SLACK_DOCS_BODY}tampered`,
      SLACK_DOCS_SIGNATURE,
      Number(SLACK_DOCS_TIMESTAMP),
    );
    expect(result).toBe(false);
  });

  it("rejects a request older than the 5-minute tolerance window", () => {
    const now = Number(SLACK_DOCS_TIMESTAMP) + 6 * 60;
    const result = verifySlackSignature(
      SLACK_DOCS_SECRET,
      SLACK_DOCS_TIMESTAMP,
      SLACK_DOCS_BODY,
      SLACK_DOCS_SIGNATURE,
      now,
    );
    expect(result).toBe(false);
  });

  it("accepts a request just inside the tolerance window", () => {
    const now = Number(SLACK_DOCS_TIMESTAMP) + 4 * 60;
    const result = verifySlackSignature(
      SLACK_DOCS_SECRET,
      SLACK_DOCS_TIMESTAMP,
      SLACK_DOCS_BODY,
      SLACK_DOCS_SIGNATURE,
      now,
    );
    expect(result).toBe(true);
  });

  it("rejects a non-numeric timestamp", () => {
    const result = verifySlackSignature(SLACK_DOCS_SECRET, "not-a-number", SLACK_DOCS_BODY, SLACK_DOCS_SIGNATURE);
    expect(result).toBe(false);
  });
});
