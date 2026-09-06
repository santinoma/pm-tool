import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const url = new URL(request.url);
  const entityType = url.searchParams.get("entityType");
  const limitParam = Number(url.searchParams.get("limit"));
  const skipParam = Number(url.searchParams.get("skip"));
  const take = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT;
  const skip = Number.isFinite(skipParam) && skipParam > 0 ? skipParam : 0;

  const entries = await context.tenantDb.auditLogEntry.findMany({
    where: entityType ? { entityType } : undefined,
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });

  return NextResponse.json({
    entries: entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      createdAt: entry.createdAt,
      actor: entry.actor ? { id: entry.actor.id, name: entry.actor.name, email: entry.actor.email } : null,
    })),
  });
}
