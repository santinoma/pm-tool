// T307: replaces the previous "Pull-on-Page-Load" behavior (time_daily/
// time_weekly automation rules only ran when an admin happened to visit the
// automations settings page) with a real, unattended background scheduler.
// `register()` runs once per server process start — see
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation.
//
// The page-load trigger in automations/page.tsx stays in place as a
// best-effort safety net; both paths are idempotent per rule via
// `lastRunPeriodKey`, so they never double-execute a rule for the same period.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // `register()` can run more than once per process in some dev-server reload
  // scenarios — a module-level flag on `globalThis` (survives HMR, unlike a
  // plain module-scope variable) keeps this to a single interval.
  const globalWithFlag = globalThis as typeof globalThis & { __pmToolAutomationSchedulerStarted?: boolean };
  if (globalWithFlag.__pmToolAutomationSchedulerStarted) return;
  globalWithFlag.__pmToolAutomationSchedulerStarted = true;

  const CHECK_INTERVAL_MS = 60_000; // matches the schedule's minute-level granularity (HH:MM)
  const { runDueAutomationsForAllTenants } = await import("@/tenant/automations/backgroundScheduler");

  setInterval(() => {
    runDueAutomationsForAllTenants().catch((error) => {
      console.error("[automations] Hintergrund-Scheduler-Durchlauf fehlgeschlagen:", error);
    });
  }, CHECK_INTERVAL_MS);
}
