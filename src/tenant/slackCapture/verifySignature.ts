import { createHmac, timingSafeEqual } from "node:crypto";

/** Slack verlangt, dass Requests mit einem älteren Timestamp als 5 Minuten abgelehnt werden. */
const TOLERANCE_SECONDS = 5 * 60;

/**
 * Implementiert Slacks öffentlich dokumentiertes Request-Signing-Verfahren:
 * https://api.slack.com/authentication/verifying-requests-from-slack
 * signature = "v0=" + HMAC-SHA256(`v0:${timestamp}:${rawBody}`, signingSecret)
 */
export function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
  now: number = Date.now() / 1000,
): boolean {
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) {
    return false;
  }
  if (Math.abs(now - timestampNumber) > TOLERANCE_SECONDS) {
    return false;
  }

  const basestring = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${createHmac("sha256", signingSecret).update(basestring).digest("hex")}`;

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
