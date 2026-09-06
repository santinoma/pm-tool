import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const dashboard = await context.tenantDb.dashboard.findUnique({ where: { id } });
  if (!dashboard || dashboard.ownerId !== context.currentUser.id) {
    return NextResponse.json({ error: "Dashboard nicht gefunden." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "name darf nicht leer sein." }, { status: 400 });
  }

  const updated = await context.tenantDb.dashboard.update({
    where: { id },
    data: { name },
  });
  return NextResponse.json({ dashboard: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const dashboard = await context.tenantDb.dashboard.findUnique({ where: { id } });
  if (!dashboard || dashboard.ownerId !== context.currentUser.id) {
    return NextResponse.json({ error: "Dashboard nicht gefunden." }, { status: 404 });
  }

  const total = await context.tenantDb.dashboard.count({ where: { ownerId: context.currentUser.id } });
  if (total <= 1) {
    return NextResponse.json({ error: "Das letzte Dashboard kann nicht gelöscht werden." }, { status: 400 });
  }

  await context.tenantDb.dashboard.delete({ where: { id } });

  if (dashboard.isDefault) {
    const next = await context.tenantDb.dashboard.findFirst({
      where: { ownerId: context.currentUser.id },
      orderBy: { position: "asc" },
    });
    if (next) {
      await context.tenantDb.dashboard.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  return NextResponse.json({ ok: true });
}
