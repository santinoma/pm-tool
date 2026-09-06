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
  if (!body || typeof body.projectId !== "string") {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }

  const existing = await context.tenantDb.taskProject.findUnique({
    where: { taskId_projectId: { taskId: id, projectId: body.projectId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Task ist bereits mit diesem Projekt verknüpft." },
      { status: 409 },
    );
  }

  const link = await context.tenantDb.taskProject.create({
    data: { taskId: id, projectId: body.projectId, isPrimary: false },
  });

  return NextResponse.json({ link }, { status: 201 });
}
