import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const existing = await context.tenantDb.savedView.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "View nicht gefunden." }, { status: 404 });
  }
  const isOwner = existing.ownerId === context.currentUser.id;
  if (!isOwner && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, viewType, filterConfig, sortConfig, sharedWithAll } = body as {
    name?: string;
    viewType?: string;
    filterConfig?: unknown;
    sortConfig?: unknown;
    sharedWithAll?: boolean;
  };

  if (sharedWithAll === true) {
    if (existing.scope === "my_tasks") {
      return NextResponse.json(
        { error: "Freigabe für alle ist für 'Meine Tasks'-Views nicht möglich." },
        { status: 400 },
      );
    }
    if (!isOwner) {
      return NextResponse.json({ error: "Nur der Eigentümer kann die Freigabe ändern." }, { status: 403 });
    }
  }

  const data: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim();
  if (typeof viewType === "string") data.viewType = viewType;
  if (filterConfig && typeof filterConfig === "object") data.filterConfig = filterConfig;
  if (sortConfig !== undefined) data.sortConfig = sortConfig && typeof sortConfig === "object" ? sortConfig : null;
  if (typeof sharedWithAll === "boolean") {
    if (!isOwner) {
      return NextResponse.json({ error: "Nur der Eigentümer kann die Freigabe ändern." }, { status: 403 });
    }
    data.sharedWithAll = sharedWithAll;
  }

  const view = await context.tenantDb.savedView.update({ where: { id }, data });
  return NextResponse.json({ view });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const existing = await context.tenantDb.savedView.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "View nicht gefunden." }, { status: 404 });
  }
  const isOwner = existing.ownerId === context.currentUser.id;
  if (!isOwner && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  await context.tenantDb.savedView.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
