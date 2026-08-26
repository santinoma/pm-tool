import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const events = await context.tenantDb.activityEvent.findMany({
    where: { projectId: id },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container" style={{ maxWidth: "700px" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Aktivität</h1>
      {events.length === 0 ? (
        <div className="empty-state">
          <h3>Noch keine Aktivität</h3>
        </div>
      ) : (
        <ul className="list-plain">
          {events.map((event) => (
            <li key={event.id} style={{ display: "block" }}>
              <span className="text-faint coord" style={{ fontSize: "var(--text-xs)" }}>
                {new Date(event.createdAt).toLocaleString("de-DE")}
              </span>
              <div>
                {event.summary}{" "}
                <span className="text-muted">({event.actor.name ?? event.actor.email})</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
