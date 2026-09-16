import { NextResponse } from "next/server";
import { authenticateApiKey, authFailureResponse, requireWriteScope } from "@/tenant/apiKeys/authenticateApiKey";
import { resolveInitialTimeEntryState } from "@/tenant/timeTracking/entryLifecycle";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return authFailureResponse(auth);

  const searchParams = new URL(request.url).searchParams;
  const projectId = searchParams.get("projectId");
  const userId = searchParams.get("userId");

  const entries = await auth.tenantDb.timeEntry.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(userId ? { userId } : {}),
    },
    include: { task: true, project: true },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    entries: entries.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      taskId: entry.taskId,
      taskTitle: entry.task?.title ?? null,
      projectId: entry.projectId,
      projectName: entry.project?.name ?? null,
      durationMinutes: entry.durationMinutes,
      description: entry.description,
      createdAt: entry.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return authFailureResponse(auth);
  const scopeError = requireWriteScope(auth);
  if (scopeError) return scopeError;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const taskId = typeof body.taskId === "string" ? body.taskId : null;
  const projectId = typeof body.projectId === "string" ? body.projectId : null;
  if (!taskId && !projectId) {
    return NextResponse.json({ error: "projectId oder taskId ist erforderlich." }, { status: 400 });
  }

  const durationMinutes = Number(body.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json({ error: "durationMinutes muss eine positive Zahl sein." }, { status: 400 });
  }

  const initialState = await resolveInitialTimeEntryState(auth.tenantDb);
  const entry = await auth.tenantDb.timeEntry.create({
    data: {
      userId: auth.user.id,
      taskId,
      projectId,
      durationMinutes: Math.round(durationMinutes),
      description: typeof body.description === "string" ? body.description : null,
      ...initialState,
    },
  });

  return NextResponse.json(
    {
      id: entry.id,
      userId: entry.userId,
      taskId: entry.taskId,
      projectId: entry.projectId,
      durationMinutes: entry.durationMinutes,
      description: entry.description,
    },
    { status: 201 },
  );
}
