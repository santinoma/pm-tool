import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { stopRunningTimer } from "@/tenant/timeTracking/timer";

export async function POST() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const entry = await stopRunningTimer(context.tenantDb, context.currentUser.id);
  if (!entry) {
    return NextResponse.json({ error: "Kein laufender Timer gefunden." }, { status: 404 });
  }

  return NextResponse.json({ entry });
}
