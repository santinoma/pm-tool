import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { AppShell } from "@/ui/shell/AppShell";
import { ProjectSubnav } from "@/ui/shell/ProjectSubnav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [project, settings] = await Promise.all([
    context.tenantDb.project.findUnique({ where: { id } }),
    getOrCreateTenantSettings(context.tenantDb),
  ]);
  if (!project) {
    redirect("/projects");
  }

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <div style={{ padding: "var(--space-6) var(--space-6) 0" }}>
        <div className="text-faint coord" style={{ fontSize: "var(--text-xs)" }}>
          Projekt
        </div>
        <h2 style={{ marginTop: "var(--space-1)", marginBottom: "var(--space-4)" }}>{project.name}</h2>
      </div>
      <ProjectSubnav
        projectId={id}
        showTriage={settings.triageEnabled}
        entitledFeatures={Array.from(context.entitledFeatures)}
      />
      {children}
    </AppShell>
  );
}
