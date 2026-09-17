import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { resolveProjectIdForTaskListGroup } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const denied = await assertSingleProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdForTaskListGroup(context.tenantDb, id),
  );
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const list = await context.tenantDb.taskListGroup.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      position: typeof body.position === "number" ? body.position : undefined,
      // T404.1: Restore läuft über denselben PATCH-Endpunkt (archived: false).
      archived: typeof body.archived === "boolean" ? body.archived : undefined,
    },
  });

  return NextResponse.json({ list });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const denied = await assertSingleProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdForTaskListGroup(context.tenantDb, id),
  );
  if (denied) return denied;

  // T404.1 (Productive-Doku: Task-Lists sind nur archivierbar, nicht
  // löschbar — vorheriges Hard-Delete war ein direkter Widerspruch zur
  // Doku und ließ echte Daten verloren gehen). "Löschen" archiviert die
  // Liste jetzt statt sie zu entfernen; ihre Tasks behalten ihre
  // `taskListGroupId`-Zuordnung (kein Nullen mehr nötig, die Liste existiert
  // ja weiterhin) und tauchen einfach nicht mehr in aktiven Listen-Ansichten
  // auf, bis die Liste wiederhergestellt wird.
  await context.tenantDb.taskListGroup.update({ where: { id }, data: { archived: true } });

  return NextResponse.json({ ok: true });
}
