import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { TeamsSettingsClient } from "./TeamsSettingsClient";

export const dynamic = "force-dynamic";

// Reference "Managing Teams in Productive": named groups of users, used for
// sharing budgets/dashboards/Docs/task views and as a filter/field in
// Resourcing and Reports. Deliberately NOT a separate "Department" model —
// per Productive's own docs, "Department" is just an example use case of a
// normal Employee Field (single-select), already covered by T216.
export default async function TeamsSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [teams, users] = await Promise.all([
    context.tenantDb.team.findMany({
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
      orderBy: { name: "asc" },
    }),
    context.tenantDb.user.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <AppShellNextElite
      currentUser={{
        name: context.currentUser.name,
        email: context.currentUser.email,
        avatarUrl: context.currentUser.avatarUrl,
        role: context.currentUser.role,
        locale: context.currentUser.locale,
      }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Teams"
    >
      <TeamsSettingsClient
        canManage={canManageMembers(context.currentUser.role)}
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          members: team.members.map((member) => ({ id: member.user.id, label: member.user.name ?? member.user.email })),
        }))}
        users={users.map((user) => ({ id: user.id, label: user.name ?? user.email }))}
      />
    </AppShellNextElite>
  );
}
