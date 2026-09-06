import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { MeetingsClient } from "./MeetingsClient";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const [meetings, projects] = await Promise.all([
    context.tenantDb.meeting.findMany({
      where: isPrivileged ? undefined : { project: { members: { some: { userId: context.currentUser.id } } } },
      orderBy: { scheduledAt: "desc" },
      include: { project: { select: { id: true, name: true } } },
    }),
    context.tenantDb.project.findMany({
      where: isPrivileged ? undefined : { members: { some: { userId: context.currentUser.id } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Meetings"
    >
      <MeetingsClient
        projects={projects}
        meetings={meetings.map((meeting) => ({
          id: meeting.id,
          title: meeting.title,
          description: meeting.description,
          scheduledAt: meeting.scheduledAt.toISOString(),
          projectId: meeting.projectId,
          projectName: meeting.project?.name ?? null,
        }))}
      />
    </AppShellNextElite>
  );
}
