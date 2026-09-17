import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { resolveProjectIdForTaskFolder } from "@/tenant/projectAccess/resolveProjectMembership";
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
    await resolveProjectIdForTaskFolder(context.tenantDb, id),
  );
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const folder = await context.tenantDb.taskFolder.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      position: typeof body.position === "number" ? body.position : undefined,
      // T404.1: Restore läuft über denselben PATCH-Endpunkt (archived: false).
      archived: typeof body.archived === "boolean" ? body.archived : undefined,
    },
    include: { lists: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json({ folder });
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
    await resolveProjectIdForTaskFolder(context.tenantDb, id),
  );
  if (denied) return denied;

  // T404.1 (Productive-Doku: Folders sind archivierbar, nicht endgültig
  // löschbar — vorheriges Verhalten war ein echter Widerspruch zur Doku).
  // "Löschen" archiviert jetzt den Ordner UND kaskadiert das Archivieren auf
  // seine Listen (nicht umgekehrt beim Wiederherstellen — Listen werden
  // einzeln restauriert), statt Tasks/Listen zu verlieren oder die Aktion
  // bei vorhandenen Listen abzulehnen.
  await context.tenantDb.$transaction([
    context.tenantDb.taskListGroup.updateMany({ where: { folderId: id }, data: { archived: true } }),
    context.tenantDb.taskFolder.update({ where: { id }, data: { archived: true } }),
  ]);

  return NextResponse.json({ ok: true });
}
