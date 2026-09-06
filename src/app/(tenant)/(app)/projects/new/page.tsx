import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { NewProjectClient } from "./NewProjectClient";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [users, clients, templates] = await Promise.all([
    context.tenantDb.user.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    context.tenantDb.client.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    context.tenantDb.project.findMany({ where: { isTemplate: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Neues Projekt"
    >
      <NewProjectClient
        currentUserId={context.currentUser.id}
        entitledFeatures={Array.from(context.entitledFeatures)}
        users={users.map((user) => ({ id: user.id, label: user.name ?? user.email }))}
        clients={clients.map((client) => ({ id: client.id, name: client.name }))}
        templates={templates.map((project) => ({ id: project.id, name: project.name }))}
      />
    </AppShellNextElite>
  );
}
