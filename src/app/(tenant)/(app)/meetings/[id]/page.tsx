import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const meeting = await context.tenantDb.meeting.findUnique({
    where: { id },
    include: { project: { select: { id: true, name: true } }, createdBy: { select: { name: true, email: true } } },
  });
  if (!meeting) {
    notFound();
  }

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle={meeting.title}
    >
      <div className="max-w-2xl py-6">
        <Link href="/meetings" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground hover:underline">
          ← Alle Meetings
        </Link>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">{meeting.title}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {meeting.scheduledAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}
        </p>

        {meeting.description && <p className="mb-6 whitespace-pre-wrap text-sm">{meeting.description}</p>}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Projekt</dt>
          <dd>
            {meeting.project ? (
              <Link href={`/projects/${meeting.project.id}/list`} className="hover:text-primary hover:underline">
                {meeting.project.name}
              </Link>
            ) : (
              "—"
            )}
          </dd>
          <dt className="text-muted-foreground">Erstellt von</dt>
          <dd>{meeting.createdBy.name ?? meeting.createdBy.email}</dd>
          <dt className="text-muted-foreground">Erstellt am</dt>
          <dd>{meeting.createdAt.toLocaleDateString("de-DE")}</dd>
        </dl>
      </div>
    </AppShellNextElite>
  );
}
