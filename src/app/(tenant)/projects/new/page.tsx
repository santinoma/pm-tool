import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShell } from "@/ui/shell/AppShell";
import { NewProjectClient } from "./NewProjectClient";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <NewProjectClient />
    </AppShell>
  );
}
