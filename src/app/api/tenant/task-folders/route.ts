import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }
  const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, projectId);
  if (denied) return denied;

  const folders = await context.tenantDb.taskFolder.findMany({
    where: { projectId },
    include: { lists: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });
  return NextResponse.json({ folders });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Name ist erforderlich." }, { status: 400 });
  }
  if (typeof body.projectId !== "string") {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }
  const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, body.projectId);
  if (denied) return denied;

  const count = await context.tenantDb.taskFolder.count({ where: { projectId: body.projectId } });

  const folder = await context.tenantDb.taskFolder.create({
    data: {
      projectId: body.projectId,
      name: body.name,
      position: count,
    },
    include: { lists: true },
  });

  return NextResponse.json({ folder }, { status: 201 });
}
