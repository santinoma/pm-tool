import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const events = await context.tenantDb.activityEvent.findMany({
    where: { projectId: id },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ events });
}
