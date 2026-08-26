import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext } from "@/tenant/context";

export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const access = await context.tenantDb.projectClientAccess.findMany({
    where: { userId: context.currentUser.id },
    include: { project: true },
  });

  return (
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-6)" }}>Ihre Projekte</h1>
      {access.length === 0 ? (
        <p className="text-muted">Ihnen wurde noch kein Projekt freigegeben.</p>
      ) : (
        <ul className="list-plain">
          {access.map((entry) => (
            <li key={entry.projectId}>
              <Link href={`/portal/${entry.projectId}`} style={{ fontWeight: 600 }}>
                {entry.project.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
