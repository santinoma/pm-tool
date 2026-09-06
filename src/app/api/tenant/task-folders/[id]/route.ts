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

  // Design decision: rather than cascading (deleting lists + nulling out task
  // assignments) on folder delete, we reject the deletion while the folder
  // still has lists — the caller must move/delete the lists first. This keeps
  // folder deletion a single, side-effect-free operation and avoids silently
  // orphaning many tasks across possibly-unrelated lists in one request.
  const listCount = await context.tenantDb.taskListGroup.count({ where: { folderId: id } });
  if (listCount > 0) {
    return NextResponse.json(
      { error: "Ordner enthält noch Listen. Bitte zuerst die Listen verschieben oder löschen." },
      { status: 409 },
    );
  }

  await context.tenantDb.taskFolder.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
