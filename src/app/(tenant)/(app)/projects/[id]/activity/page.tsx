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
    <div className="mx-auto max-w-2xl pb-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Aktivität</h1>
      {events.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Aktivität</h3>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id} className="border-b pb-3 last:border-0">
              <span className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString("de-DE")}</span>
              <div className="text-sm">
                {event.summary} <span className="text-muted-foreground">({event.actor.name ?? event.actor.email})</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
