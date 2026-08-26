import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { defaultWorkflowStatuses } from "@/tenant/projects/workflow";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const projects = await context.tenantDb.project.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ projects });
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

  const project = await context.tenantDb.project.create({
    data: {
      name: body.name,
      description: typeof body.description === "string" ? body.description : null,
      statuses: { create: defaultWorkflowStatuses() },
    },
    include: { statuses: true },
  });

  return NextResponse.json({ project }, { status: 201 });
}
