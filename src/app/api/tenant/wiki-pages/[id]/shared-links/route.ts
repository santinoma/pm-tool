import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { generateInviteToken } from "@/tenant/auth/invite";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { resolveProjectIdForWikiPage } from "@/tenant/projectAccess/resolveProjectMembership";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const links = await context.tenantDb.sharedWikiLink.findMany({
    where: { wikiPageId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ links });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  const denied = await assertSingleProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdForWikiPage(context.tenantDb, id),
  );
  if (denied) return denied;

  const link = await context.tenantDb.sharedWikiLink.create({
    data: {
      wikiPageId: id,
      token: generateInviteToken(),
      createdById: context.currentUser.id,
    },
  });
  return NextResponse.json({ link }, { status: 201 });
}
