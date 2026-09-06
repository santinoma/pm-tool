import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { MembersClient } from "./MembersClient";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const users = await context.tenantDb.user.findMany({ orderBy: { createdAt: "asc" } });
  const invites = await context.tenantDb.invite.findMany({
    where: { acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const projects = await context.tenantDb.project.findMany({ orderBy: { name: "asc" } });
  const hasCustomRolesFeature = context.entitledFeatures.has("custom_roles");
  const customRoles = hasCustomRolesFeature
    ? await context.tenantDb.customRole.findMany({ orderBy: { name: "asc" } })
    : [];
  const holidayCalendars = await context.tenantDb.holidayCalendar.findMany({ orderBy: { name: "asc" } });

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Mitglieder"
    >
      <MembersClient
        currentUserId={context.currentUser.id}
        canManage={canManageMembers(context.currentUser.role)}
        users={users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          isActive: user.isActive,
          internalCostRate: user.internalCostRate,
          customRoleId: user.customRoleId,
          holidayCalendarId: user.holidayCalendarId,
          managerId: user.managerId,
        }))}
        invites={invites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt.toISOString(),
        }))}
        projects={projects.map((project) => ({ id: project.id, name: project.name }))}
        customRoles={customRoles.map((role) => ({ id: role.id, name: role.name }))}
        holidayCalendars={holidayCalendars.map((calendar) => ({ id: calendar.id, name: calendar.name }))}
        hasCustomRolesFeature={hasCustomRolesFeature}
        hasProjectOverridesFeature={context.entitledFeatures.has("project_role_overrides")}
      />
    </AppShellNextElite>
  );
}
