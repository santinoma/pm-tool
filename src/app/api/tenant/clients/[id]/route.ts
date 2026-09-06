import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { wouldCreateCycle } from "@/tenant/clients/hierarchy";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  let parentId: string | null | undefined;
  if ("parentId" in body) {
    if (body.parentId === null || body.parentId === "") {
      parentId = null;
    } else if (typeof body.parentId === "string") {
      const allClients = await context.tenantDb.client.findMany({ select: { id: true, parentId: true } });
      if (!allClients.some((c) => c.id === body.parentId)) {
        return NextResponse.json({ error: "Übergeordneter Client nicht gefunden." }, { status: 400 });
      }
      if (wouldCreateCycle(id, body.parentId, allClients)) {
        return NextResponse.json({ error: "Diese Zuordnung würde einen Zyklus erzeugen." }, { status: 400 });
      }
      parentId = body.parentId;
    }
  }

  let archivedAt: Date | null | undefined;
  if ("archivedAt" in body) {
    if (body.archivedAt === null) {
      archivedAt = null;
    } else if (typeof body.archivedAt === "string") {
      const parsed = new Date(body.archivedAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Ungültiges Datum." }, { status: 400 });
      }
      archivedAt = parsed;
    }
  }

  const client = await context.tenantDb.client.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      note: typeof body.note === "string" ? body.note : body.note === null ? null : undefined,
      taxId: typeof body.taxId === "string" ? body.taxId : body.taxId === null ? null : undefined,
      website: typeof body.website === "string" ? body.website : body.website === null ? null : undefined,
      billingAddress:
        typeof body.billingAddress === "string" ? body.billingAddress : body.billingAddress === null ? null : undefined,
      archivedAt,
      parentId,
    },
  });
  return NextResponse.json({ client });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  await context.tenantDb.project.updateMany({ where: { clientId: id }, data: { clientId: null } });
  await context.tenantDb.client.updateMany({ where: { parentId: id }, data: { parentId: null } });
  await context.tenantDb.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
