import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { validateEntryTarget } from "@/tenant/timeTracking/duration";
import { stopRunningTimer } from "@/tenant/timeTracking/timer";

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const taskId = typeof body?.taskId === "string" ? body.taskId : null;
  const projectId = typeof body?.projectId === "string" ? body.projectId : null;

  const settings = await getOrCreateTenantSettings(context.tenantDb);
  const validation = validateEntryTarget({ taskId, projectId }, settings.allowProjectLevelTimeEntries);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const now = new Date();
  const stoppedEntry = await stopRunningTimer(context.tenantDb, context.currentUser.id, now);

  const entry = await context.tenantDb.timeEntry.create({
    data: { userId: context.currentUser.id, taskId, projectId, startedAt: now },
  });

  return NextResponse.json({ entry, stoppedPreviousEntry: stoppedEntry }, { status: 201 });
}
