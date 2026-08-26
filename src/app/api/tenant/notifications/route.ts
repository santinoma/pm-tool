import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const notifications = await context.tenantDb.notification.findMany({
    where: { userId: context.currentUser.id },
    include: { activityEvent: { include: { actor: true, project: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notifications });
}
