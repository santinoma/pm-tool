import { NextResponse } from "next/server";
import { authenticateApiKey, authFailureResponse, requireWriteScope } from "@/tenant/apiKeys/authenticateApiKey";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return authFailureResponse(auth);

  const projectId = new URL(request.url).searchParams.get("projectId");
  const tasks = await auth.tenantDb.task.findMany({
    where: projectId ? { projects: { some: { projectId } } } : undefined,
    include: { status: true, assignee: true },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status.name,
      assignee: task.assignee?.email ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return authFailureResponse(auth);
  const scopeError = requireWriteScope(auth);
  if (scopeError) return scopeError;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || typeof body.projectId !== "string") {
    return NextResponse.json({ error: "title und projectId sind erforderlich." }, { status: 400 });
  }

  const defaultStatus = await auth.tenantDb.workflowStatus.findFirst({
    where: { projectId: body.projectId, isDefault: true },
  });
  if (!defaultStatus) {
    return NextResponse.json({ error: "Projekt hat keinen Default-Status." }, { status: 409 });
  }

  const task = await auth.tenantDb.task.create({
    data: {
      title: body.title,
      statusId: defaultStatus.id,
      projects: { create: { projectId: body.projectId, isPrimary: true } },
    },
  });

  return NextResponse.json({ id: task.id, title: task.title }, { status: 201 });
}
