import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { resolveProjectIdsForTask } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertAnyProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

/** Hängt einen Tag an den Task — legt den Tag bei Bedarf an (find-or-create per Name). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const denied = await assertAnyProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdsForTask(context.tenantDb, id),
  );
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }
  const name = body.name.trim();

  const tag = await context.tenantDb.tag.upsert({
    where: { name },
    create: { name },
    update: {},
  });

  const link = await context.tenantDb.taskTag.upsert({
    where: { taskId_tagId: { taskId: id, tagId: tag.id } },
    create: { taskId: id, tagId: tag.id },
    update: {},
    include: { tag: true },
  });

  return NextResponse.json({ tag: link.tag }, { status: 201 });
}
