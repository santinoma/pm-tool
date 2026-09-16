import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { getOrCreateDefaultWorkflow } from "@/tenant/projects/workflow";
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

  // Reference "Creating and Managing Workflows": a template clone gets its own
  // independent Workflow (customizing it shouldn't affect the template or other
  // projects); an explicit workflowId reuses an existing organization Workflow as-is
  // (the actual sharing Productive's model is built around); otherwise the project
  // falls back to the tenant's single shared Default workflow.
  let workflowCreateOrConnect: { create: { name: string; statuses: { create: ReturnType<typeof buildClonedStatuses> } } } | { connect: { id: string } };
  if (typeof body.templateProjectId === "string") {
    const template = await context.tenantDb.project.findUnique({
      where: { id: body.templateProjectId },
      include: { workflow: { include: { statuses: true } } },
    });
    if (template?.isTemplate) {
      workflowCreateOrConnect = {
        create: { name: `${body.name} Workflow`, statuses: { create: buildClonedStatuses(template.workflow.statuses) } },
      };
    } else {
      workflowCreateOrConnect = { connect: { id: (await getOrCreateDefaultWorkflow(context.tenantDb)).id } };
    }
  } else if (typeof body.workflowId === "string") {
    workflowCreateOrConnect = { connect: { id: body.workflowId } };
  } else {
    workflowCreateOrConnect = { connect: { id: (await getOrCreateDefaultWorkflow(context.tenantDb)).id } };
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
      // Relation-style (not the raw *Id scalar) so this stays compatible with the
      // `workflow: { create/connect }` relation input below — Prisma rejects mixing
      // relation-create fields with raw scalar FK fields in the same create() call.
      client: typeof body.clientId === "string" ? { connect: { id: body.clientId } } : undefined,
      projectManager: typeof body.projectManagerId === "string" ? { connect: { id: body.projectManagerId } } : undefined,
      enabledModules,
      workflow: workflowCreateOrConnect,
      members: { create: Array.from(memberUserIds).map((userId) => ({ userId })) },
    },
    include: { workflow: { include: { statuses: true } }, members: true },
  });

  return NextResponse.json({ project }, { status: 201 });
}
