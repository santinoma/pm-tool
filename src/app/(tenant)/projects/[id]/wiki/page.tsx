import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";

export const dynamic = "force-dynamic";

export default async function WikiListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const pages = await context.tenantDb.wikiPage.findMany({
    where: { projectId: id },
    orderBy: { title: "asc" },
  });

  return (
    <div className="container" style={{ maxWidth: "700px" }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <h1>Wiki</h1>
        <Link href={`/projects/${id}/wiki/new`} className="btn btn-primary">
          Neue Seite
        </Link>
      </div>
      {pages.length === 0 ? (
        <div className="empty-state">
          <h3>Noch keine Wiki-Seiten</h3>
        </div>
      ) : (
        <ul className="list-plain">
          {pages.map((page) => (
            <li key={page.id}>
              <Link href={`/projects/${id}/wiki/${page.id}`} style={{ fontWeight: 600 }}>
                {page.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
