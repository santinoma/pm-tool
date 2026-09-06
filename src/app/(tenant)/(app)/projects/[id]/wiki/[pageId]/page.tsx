import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { renderMarkdownSafe } from "@/tenant/collaboration/markdown";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { WikiPageClient } from "./WikiPageClient";

export const dynamic = "force-dynamic";

export default async function WikiPageView({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>;
}) {
  const { id, pageId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const page = await context.tenantDb.wikiPage.findUnique({ where: { id: pageId } });
  if (!page) {
    redirect(`/projects/${id}/wiki`);
  }

  const canManage = canManageMembers(context.currentUser.role);

  const [customFieldDefs, customValues, sharedLinks, siblingPages] = await Promise.all([
    context.tenantDb.customFieldDef.findMany({ where: { projectId: id, entityType: "wiki_page" } }),
    context.tenantDb.wikiPageCustomFieldValue.findMany({ where: { wikiPageId: pageId } }),
    canManage
      ? context.tenantDb.sharedWikiLink.findMany({ where: { wikiPageId: pageId }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
    context.tenantDb.wikiPage.findMany({
      where: { projectId: id },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <WikiPageClient
      projectId={id}
      page={{ id: page.id, title: page.title, content: page.content, isTemplate: page.isTemplate }}
      contentHtml={renderMarkdownSafe(page.content)}
      canManage={canManage}
      customFieldDefs={customFieldDefs.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        options: field.options,
      }))}
      customFieldValues={customValues.map((value) => ({ fieldId: value.fieldId, value: value.value }))}
      sharedLinks={sharedLinks.map((link) => ({
        id: link.id,
        token: link.token,
        revokedAt: link.revokedAt ? link.revokedAt.toISOString() : null,
      }))}
      siblingPages={siblingPages}
    />
  );
}
