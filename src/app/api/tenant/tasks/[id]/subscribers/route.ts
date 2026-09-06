import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { resolveProjectIdsForTask } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertAnyProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

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
  if (!body || typeof body.userId !== "string") {
    return NextResponse.json({ error: "userId ist erforderlich." }, { status: 400 });
  }

  const subscriber = await context.tenantDb.taskSubscriber.upsert({
    where: { taskId_userId: { taskId: id, userId: body.userId } },
    create: { taskId: id, userId: body.userId },
    update: {},
    include: { user: true },
  });
  return NextResponse.json({ subscriber }, { status: 201 });
}
