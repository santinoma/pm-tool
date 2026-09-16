import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

const VALID_SCOPES = ["project", "my_tasks", "budgets"];

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const scope = searchParams.get("scope") ?? (projectId ? "project" : null);

  if (scope === "project" || scope === "budgets") {
    if (!projectId) {
      return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
    }
    const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, projectId);
    if (denied) return denied;

    const views = await context.tenantDb.savedView.findMany({
      where: {
        scope,
        projectId,
        OR: [{ ownerId: context.currentUser.id }, { sharedWithAll: true }],
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ views });
  }

  if (scope === "my_tasks") {
    const views = await context.tenantDb.savedView.findMany({
      where: { scope: "my_tasks", ownerId: context.currentUser.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ views });
  }

  return NextResponse.json({ error: "scope ('project'|'budgets'|'my_tasks') ist erforderlich." }, { status: 400 });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { scope, projectId, name, viewType, filterConfig, sortConfig, sharedWithAll } = body as {
    scope?: string;
    projectId?: string;
    name?: string;
    viewType?: string;
    filterConfig?: unknown;
    sortConfig?: unknown;
    sharedWithAll?: boolean;
  };

  if (!scope || !VALID_SCOPES.includes(scope)) {
    return NextResponse.json({ error: "scope ('project'|'budgets'|'my_tasks') ist erforderlich." }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }
  if (!viewType || typeof viewType !== "string") {
    return NextResponse.json({ error: "viewType ist erforderlich." }, { status: 400 });
  }
  if (!filterConfig || typeof filterConfig !== "object") {
    return NextResponse.json({ error: "filterConfig ist erforderlich." }, { status: 400 });
  }

  if (scope === "my_tasks") {
    if (sharedWithAll === true) {
      return NextResponse.json(
        { error: "Freigabe für alle ist für 'Meine Tasks'-Views nicht möglich." },
        { status: 400 },
      );
    }
    const view = await context.tenantDb.savedView.create({
      data: {
        scope: "my_tasks",
        projectId: null,
        name: name.trim(),
        viewType,
        filterConfig: filterConfig as object,
        sortConfig: (sortConfig as object) ?? undefined,
        ownerId: context.currentUser.id,
        sharedWithAll: false,
      },
    });
    return NextResponse.json({ view }, { status: 201 });
  }

  // scope === "project" | "budgets"
  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }
  const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, projectId);
  if (denied) return denied;

  const view = await context.tenantDb.savedView.create({
    data: {
      scope,
      projectId,
      name: name.trim(),
      viewType,
      filterConfig: filterConfig as object,
      sortConfig: (sortConfig as object) ?? undefined,
      ownerId: context.currentUser.id,
      sharedWithAll: sharedWithAll === true,
    },
  });
  return NextResponse.json({ view }, { status: 201 });
}
