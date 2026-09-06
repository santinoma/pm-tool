import { canManageMembers } from "../auth/roleGuard";
import type { PrismaClient, User } from "../../generated/tenant-client/client.js";

/**
 * owner/admin sehen weiterhin uneingeschränkt alle Projekte (Verwaltungs-
 * Notwendigkeit) — Mitgliedschaft wird nur für member/client geprüft. Die
 * `client`-Portal-Rolle nutzt weiterhin ausschließlich `ProjectClientAccess`
 * (siehe `tenant/portal/portalAccess.ts`), unverändert von diesem Modul.
 */
export async function hasProjectMemberAccess(
  tenantDb: PrismaClient,
  user: User,
  projectId: string,
): Promise<boolean> {
  if (canManageMembers(user.role)) return true;
  const membership = await tenantDb.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  return membership !== null;
}

/**
 * Für Cross-Tagging (ein Task kann in mehreren Projekten hängen): Zugriff
 * genügt, sobald der Nutzer Mitglied mindestens eines der Projekte ist.
 */
export async function hasAnyProjectMemberAccess(
  tenantDb: PrismaClient,
  user: User,
  projectIds: string[],
): Promise<boolean> {
  if (canManageMembers(user.role)) return true;
  if (projectIds.length === 0) return false;
  const membership = await tenantDb.projectMember.findFirst({
    where: { userId: user.id, projectId: { in: projectIds } },
  });
  return membership !== null;
}

export async function resolveProjectIdsForTask(tenantDb: PrismaClient, taskId: string): Promise<string[]> {
  const links = await tenantDb.taskProject.findMany({ where: { taskId }, select: { projectId: true } });
  return links.map((link) => link.projectId);
}

export async function resolveProjectIdForBudget(tenantDb: PrismaClient, budgetId: string): Promise<string | null> {
  const budget = await tenantDb.budget.findUnique({ where: { id: budgetId }, select: { projectId: true } });
  return budget?.projectId ?? null;
}

export async function resolveProjectIdForWikiPage(tenantDb: PrismaClient, wikiPageId: string): Promise<string | null> {
  const page = await tenantDb.wikiPage.findUnique({ where: { id: wikiPageId }, select: { projectId: true } });
  return page?.projectId ?? null;
}

export async function resolveProjectIdForSharedWikiLink(
  tenantDb: PrismaClient,
  sharedWikiLinkId: string,
): Promise<string | null> {
  const link = await tenantDb.sharedWikiLink.findUnique({
    where: { id: sharedWikiLinkId },
    select: { wikiPage: { select: { projectId: true } } },
  });
  return link?.wikiPage.projectId ?? null;
}

export async function resolveProjectIdForBudgetSection(
  tenantDb: PrismaClient,
  sectionId: string,
): Promise<string | null> {
  const section = await tenantDb.budgetSection.findUnique({
    where: { id: sectionId },
    select: { budget: { select: { projectId: true } } },
  });
  return section?.budget.projectId ?? null;
}

export async function resolveProjectIdForInvoice(tenantDb: PrismaClient, invoiceId: string): Promise<string | null> {
  const invoice = await tenantDb.invoice.findUnique({
    where: { id: invoiceId },
    select: { budget: { select: { projectId: true } } },
  });
  return invoice?.budget.projectId ?? null;
}

export async function resolveProjectIdForCommentTask(
  tenantDb: PrismaClient,
  commentId: string,
): Promise<string[] | null> {
  const comment = await tenantDb.comment.findUnique({ where: { id: commentId }, select: { taskId: true } });
  if (!comment) return null;
  return resolveProjectIdsForTask(tenantDb, comment.taskId);
}

export async function resolveProjectIdForTaskFolder(
  tenantDb: PrismaClient,
  folderId: string,
): Promise<string | null> {
  const folder = await tenantDb.taskFolder.findUnique({ where: { id: folderId }, select: { projectId: true } });
  return folder?.projectId ?? null;
}

export async function resolveProjectIdForTaskListGroup(
  tenantDb: PrismaClient,
  listGroupId: string,
): Promise<string | null> {
  const listGroup = await tenantDb.taskListGroup.findUnique({
    where: { id: listGroupId },
    select: { folder: { select: { projectId: true } } },
  });
  return listGroup?.folder.projectId ?? null;
}

export async function resolveProjectIdForAttachmentTask(
  tenantDb: PrismaClient,
  attachmentId: string,
): Promise<string[] | null> {
  const attachment = await tenantDb.attachment.findUnique({
    where: { id: attachmentId },
    select: { taskId: true },
  });
  if (!attachment) return null;
  return resolveProjectIdsForTask(tenantDb, attachment.taskId);
}
