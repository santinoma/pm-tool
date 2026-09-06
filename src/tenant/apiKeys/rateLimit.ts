/**
 * In-memory fixed-window rate limiter for public API keys (`/api/v1/**`).
 *
 * LIMITATION: state lives in a module-level `Map` inside the Node process.
 * It resets on every process restart (deploy, crash, serverless cold start)
 * and is NOT shared across multiple instances. That's an acceptable
 * trade-off for a small-team tool with modest API traffic — a correct
 * multi-instance limiter would need a shared store (e.g. Redis).
 */

const WINDOW_MS = 10_000;
const MAX_REQUESTS_PER_WINDOW = 100;

interface WindowState {
  windowStart: number;
  count: number;
}

const windows = new Map<string, WindowState>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Checks (and records) one request against the fixed-window limit for the
 * given API key id. `now` is injectable so tests can drive the clock
 * deterministically instead of relying on real wall-clock time.
 */
export function checkRateLimit(apiKeyId: string, now: () => number = Date.now): RateLimitResult {
  const nowMs = now();
  const state = windows.get(apiKeyId);

  if (!state || nowMs - state.windowStart >= WINDOW_MS) {
    windows.set(apiKeyId, { windowStart: nowMs, count: 1 });
    return { allowed: true };
  }

  if (state.count < MAX_REQUESTS_PER_WINDOW) {
    state.count += 1;
    return { allowed: true };
  }

  const retryAfterMs = state.windowStart + WINDOW_MS - nowMs;
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
}
