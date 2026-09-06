import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { defaultWorkflowStatuses } from "@/tenant/projects/workflow";
import { buildClonedStatuses } from "@/tenant/projectTemplates/cloneProjectTemplate";
import { sanitizeEnabledModules } from "@/tenant/projects/moduleCatalog";
import { isValidProjectColor, PROJECT_COLOR_PALETTE } from "@/tenant/projects/colorPalette";

const VALID_TYPES = ["client", "internal"];

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const projects = await context.tenantDb.project.findMany({
    where: isPrivileged ? undefined : { members: { some: { userId: context.currentUser.id } } },
    orderBy: { createdAt: "desc" },
  });
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
  if (body.type !== undefined && !VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "type muss 'client' oder 'internal' sein." }, { status: 400 });
  }
  const color = typeof body.color === "string" && isValidProjectColor(body.color) ? body.color : PROJECT_COLOR_PALETTE[0];
  const enabledModules = sanitizeEnabledModules(Array.isArray(body.enabledModules) ? body.enabledModules : []);

  let statuses = defaultWorkflowStatuses();
  if (typeof body.templateProjectId === "string") {
    const template = await context.tenantDb.project.findUnique({
      where: { id: body.templateProjectId },
      include: { statuses: true },
    });
    if (template?.isTemplate) {
      statuses = buildClonedStatuses(template.statuses);
    }
  }

  const memberUserIds = new Set<string>(
    Array.isArray(body.memberUserIds) ? body.memberUserIds.filter((id: unknown) => typeof id === "string") : [],
  );
  memberUserIds.add(context.currentUser.id);

  const project = await context.tenantDb.project.create({
    data: {
      name: body.name,
      description: typeof body.description === "string" ? body.description : null,
      type: body.type ?? "internal",
      color,
      clientId: typeof body.clientId === "string" ? body.clientId : null,
      projectManagerId: typeof body.projectManagerId === "string" ? body.projectManagerId : null,
      enabledModules,
      statuses: { create: statuses },
      members: { create: Array.from(memberUserIds).map((userId) => ({ userId })) },
    },
    include: { statuses: true, members: true },
  });

  return NextResponse.json({ project }, { status: 201 });
}
