import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

const VALID_CATEGORIES = ["not_started", "started", "done"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const statuses = await context.tenantDb.workflowStatus.findMany({
    where: { workflow: { projects: { some: { id } } } },
    orderBy: { position: "asc" },
  });
  return NextResponse.json({ statuses });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    body.name.trim().length === 0 ||
    !VALID_CATEGORIES.includes(body.category)
  ) {
    return NextResponse.json(
      { error: "Name und eine gültige Kategorie sind erforderlich." },
      { status: 400 },
    );
  }

  const project = await context.tenantDb.project.findUnique({ where: { id }, select: { workflowId: true } });
  if (!project) {
    return NextResponse.json({ error: "Projekt nicht gefunden." }, { status: 404 });
  }

  // Reference "Creating and Managing Workflows": this Workflow may be shared by
  // several projects, so a new status here becomes visible on all of them.
  const existing = await context.tenantDb.workflowStatus.findMany({ where: { workflowId: project.workflowId } });
  const nextPosition = existing.length > 0 ? Math.max(...existing.map((s) => s.position)) + 1 : 0;

  const status = await context.tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: body.name, category: body.category, position: nextPosition },
  });
  return NextResponse.json({ status }, { status: 201 });
}
