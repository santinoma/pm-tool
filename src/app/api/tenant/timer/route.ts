import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

/**
 * Liefert den aktuell laufenden Timer des angemeldeten Nutzers (falls
 * vorhanden) — für das globale Timer-Widget in der App-Chrome, das
 * unabhängig vom aktuellen Screen sichtbar sein muss (siehe
 * SPEC-time-tracking.md §Timer-Widget).
 */
export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const runningEntry = await context.tenantDb.timeEntry.findFirst({
    where: { userId: context.currentUser.id, startedAt: { not: null }, endedAt: null },
    include: { task: { select: { title: true } }, project: { select: { name: true } } },
  });

  if (!runningEntry || !runningEntry.startedAt) {
    return NextResponse.json({ entry: null });
  }

  return NextResponse.json({
    entry: {
      id: runningEntry.id,
      startedAt: runningEntry.startedAt.toISOString(),
      label: runningEntry.task?.title ?? runningEntry.project?.name ?? "—",
      taskId: runningEntry.taskId,
    },
  });
}
