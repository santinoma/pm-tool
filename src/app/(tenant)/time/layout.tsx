import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShell } from "@/ui/shell/AppShell";
import { TimeSubnav } from "@/ui/shell/TimeSubnav";

export default async function TimeLayout({ children }: { children: React.ReactNode }) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <TimeSubnav showCompanyTime={canManageMembers(context.currentUser.role)} />
      {children}
    </AppShell>
  );
}
