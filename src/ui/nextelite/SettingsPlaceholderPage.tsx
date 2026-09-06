import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { Badge } from "@/ui/shadcn/components/badge";

export async function SettingsPlaceholderPage({ title, description }: { title: string; description: string }) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle={title}
    >
      <div className="mx-auto max-w-xl pb-10">
        <div className="mb-4 flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <Badge variant="warningOutline">In Entwicklung</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </AppShellNextElite>
  );
}
