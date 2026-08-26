import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { renderMarkdownSafe } from "@/tenant/collaboration/markdown";
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

  return (
    <WikiPageClient
      projectId={id}
      page={{ id: page.id, title: page.title, content: page.content }}
      contentHtml={renderMarkdownSafe(page.content)}
    />
  );
}
