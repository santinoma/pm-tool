import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { defaultWorkflowStatuses } from "@/tenant/projects/workflow";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const workflows = await context.tenantDb.workflow.findMany({
    include: { _count: { select: { statuses: true, projects: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ workflows });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Name ist erforderlich." }, { status: 400 });
  }

  const workflow = await context.tenantDb.workflow.create({
    data: { name: body.name, statuses: { create: defaultWorkflowStatuses() } },
    include: { statuses: true },
  });
  return NextResponse.json({ workflow }, { status: 201 });
}
