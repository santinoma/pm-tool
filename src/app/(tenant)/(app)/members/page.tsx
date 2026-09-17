import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { getOrCreateSystemPermissionSets, getDefaultSystemSetNameForRole } from "@/tenant/permissions/systemPermissionSets";
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
  // T402: die acht System-Permission-Sets (Admin/Manager/Profitability
  // Manager/Coordinator/Staff/Contractor/Client Collaborator/Client Lead)
  // sind IMMER verfügbar, unabhängig vom `custom_roles`-Feature — nur
  // echte, selbst angelegte Custom Roles bleiben Ultimate-gated (gefiltert
  // clientseitig in MembersClient anhand `isSystem`/`hasCustomRolesFeature`).
  await getOrCreateSystemPermissionSets(context.tenantDb);
  const customRoles = await context.tenantDb.customRole.findMany({
    where: hasCustomRolesFeature ? undefined : { isSystem: true },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
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
          defaultSystemSetName: getDefaultSystemSetNameForRole(user.role),
          holidayCalendarId: user.holidayCalendarId,
          managerId: user.managerId,
          employmentType: user.employmentType,
        }))}
        invites={invites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt.toISOString(),
        }))}
        projects={projects.map((project) => ({ id: project.id, name: project.name }))}
        customRoles={customRoles.map((role) => ({ id: role.id, name: role.name, isSystem: role.isSystem }))}
        holidayCalendars={holidayCalendars.map((calendar) => ({ id: calendar.id, name: calendar.name }))}
        hasCustomRolesFeature={hasCustomRolesFeature}
        hasProjectOverridesFeature={context.entitledFeatures.has("project_role_overrides")}
      />
    </AppShellNextElite>
  );
}
