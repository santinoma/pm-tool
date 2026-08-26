import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShell } from "@/ui/shell/AppShell";

export async function SettingsPlaceholderPage({ title, description }: { title: string; description: string }) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <div className="container" style={{ maxWidth: "560px" }}>
        <h1 style={{ marginBottom: "var(--space-4)" }}>{title}</h1>
        <p className="text-muted">{description}</p>
      </div>
    </AppShell>
  );
}
