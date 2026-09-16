import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { ThemeToggle } from "@/ui/shadcn/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function AppearanceSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Appearance"
    >
      <div className="mx-auto max-w-xl pb-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Appearance</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Wähle, ob PM·Atlas auf diesem Gerät im hellen oder dunklen Design angezeigt wird.
        </p>
        <div className="rounded-lg border p-1">
          <ThemeToggle variant="titled" title="Dunkles Design" />
        </div>
      </div>
    </AppShellNextElite>
  );
}
