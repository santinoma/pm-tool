import { NextResponse } from "next/server";
import { hasProjectMemberAccess, hasAnyProjectMemberAccess } from "./resolveProjectMembership";
import type { PrismaClient, User } from "../../generated/tenant-client/client.js";

/** Für Ressourcen mit genau einem Projekt-Bezug (Budget, Cycle, Baseline, Wiki, ...). */
export async function assertSingleProjectAccess(
  tenantDb: PrismaClient,
  user: User,
  projectId: string | null,
): Promise<NextResponse | null> {
  if (!projectId) {
    return NextResponse.json({ error: "Ressource nicht gefunden." }, { status: 404 });
  }
  const allowed = await hasProjectMemberAccess(tenantDb, user, projectId);
  if (!allowed) {
    return NextResponse.json({ error: "Kein Zugriff auf dieses Projekt." }, { status: 403 });
  }
  return null;
}

/** Für Cross-Tagging-Ressourcen (Task, Kommentar, Anhang, ...) mit mehreren möglichen Projekten. */
export async function assertAnyProjectAccess(
  tenantDb: PrismaClient,
  user: User,
  projectIds: string[] | null,
): Promise<NextResponse | null> {
  if (!projectIds || projectIds.length === 0) {
    return NextResponse.json({ error: "Ressource nicht gefunden." }, { status: 404 });
  }
  const allowed = await hasAnyProjectMemberAccess(tenantDb, user, projectIds);
  if (!allowed) {
    return NextResponse.json({ error: "Kein Zugriff auf dieses Projekt." }, { status: 403 });
  }
  return null;
}
