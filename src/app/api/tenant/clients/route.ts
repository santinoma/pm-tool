import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const status = new URL(request.url).searchParams.get("status");
  const where = status === "archived" ? { archivedAt: { not: null } } : status === "all" ? {} : { archivedAt: null };

  const clients = await context.tenantDb.client.findMany({ where, orderBy: { name: "asc" } });
  return NextResponse.json({ clients });
}

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value.trim().length > 0 ? value : null;
  return undefined;
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }

  const client = await context.tenantDb.client.create({
    data: {
      name: body.name,
      note: typeof body.note === "string" ? body.note : null,
      taxId: optionalString(body.taxId) ?? null,
      website: optionalString(body.website) ?? null,
      billingAddress: optionalString(body.billingAddress) ?? null,
      parentId: typeof body.parentId === "string" && body.parentId.trim().length > 0 ? body.parentId : null,
      type: typeof body.type === "string" ? body.type : null,
      accountOwnerId: typeof body.accountOwnerId === "string" && body.accountOwnerId.length > 0 ? body.accountOwnerId : null,
      paymentTermsDays: typeof body.paymentTermsDays === "number" ? body.paymentTermsDays : null,
    },
  });
  return NextResponse.json({ client }, { status: 201 });
}
