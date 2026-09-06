import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { detectDependencyCycle } from "@/tenant/projects/workflow";
import { resolveProjectIdsForTask } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertAnyProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const [blocking, blockedBy] = await Promise.all([
    context.tenantDb.taskDependency.findMany({
      where: { blockingTaskId: id },
      include: { blockedTask: true },
    }),
    context.tenantDb.taskDependency.findMany({
      where: { blockedTaskId: id },
      include: { blockingTask: true },
    }),
  ]);

  return NextResponse.json({ blocking, blockedBy });
}

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
  if (!body || typeof body.blockedTaskId !== "string") {
    return NextResponse.json({ error: "blockedTaskId ist erforderlich." }, { status: 400 });
  }

  const newEdge = { blockingTaskId: id, blockedTaskId: body.blockedTaskId };
  const existingEdges = await context.tenantDb.taskDependency.findMany({
    select: { blockingTaskId: true, blockedTaskId: true },
  });

  if (detectDependencyCycle(existingEdges, newEdge)) {
    return NextResponse.json(
      { error: "Diese Verknüpfung würde eine zyklische Abhängigkeit erzeugen." },
      { status: 409 },
    );
  }

  const dependency = await context.tenantDb.taskDependency.create({ data: newEdge });
  return NextResponse.json({ dependency }, { status: 201 });
}
