import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const baselines = await context.tenantDb.baseline.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ baselines });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }

  const tasks = await context.tenantDb.task.findMany({
    where: { projects: { some: { projectId: id } } },
    include: { status: true },
  });

  const baseline = await context.tenantDb.baseline.create({
    data: {
      projectId: id,
      name: body.name,
      snapshots: {
        create: tasks.map((task) => ({
          taskId: task.id,
          taskTitle: task.title,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          statusCategory: task.status.category,
        })),
      },
    },
    include: { snapshots: true },
  });

  return NextResponse.json({ baseline }, { status: 201 });
}
