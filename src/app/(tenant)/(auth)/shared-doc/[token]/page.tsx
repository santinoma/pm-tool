import { getTenantContext } from "@/tenant/context";
import { renderMarkdownSafe } from "@/tenant/collaboration/markdown";
import { isSharedWikiLinkValid } from "@/tenant/sharedWiki/sharedWikiLinkAccess";
import { Badge } from "@/ui/shadcn/components/badge";

export const dynamic = "force-dynamic";

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm">
        <h1 className="mb-3 text-xl font-bold tracking-tight">Link nicht verfügbar</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default async function SharedWikiDocPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const context = await getTenantContext();
  if (!context) {
    return <ErrorPage message="Unbekannter Tenant." />;
  }

  const link = await context.tenantDb.sharedWikiLink.findUnique({
    where: { token },
    include: { wikiPage: true },
  });
  if (!link) {
    return <ErrorPage message="Dieser Link existiert nicht." />;
  }

  const validation = isSharedWikiLinkValid(link);
  if (!validation.valid) {
    return <ErrorPage message="Dieser Link wurde widerrufen." />;
  }

  return (
    <div className="min-h-dvh bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-2xl text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5">
        <Badge variant="secondary" className="mb-2">
          Freigegebene Wiki-Seite
        </Badge>
        <h1 className="mb-4 text-2xl font-bold tracking-tight">{link.wikiPage.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(link.wikiPage.content) }} />
      </div>
    </div>
  );
}
