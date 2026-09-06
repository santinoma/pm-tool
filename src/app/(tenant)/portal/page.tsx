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
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Ihre Projekte</h1>
      {access.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ihnen wurde noch kein Projekt freigegeben.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {access.map((entry) => (
            <li key={entry.projectId}>
              <Link href={`/portal/${entry.projectId}`} className="text-sm font-semibold text-primary hover:underline">
                {entry.project.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
