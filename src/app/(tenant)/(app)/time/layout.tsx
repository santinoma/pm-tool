import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { TimeSubnav } from "@/ui/nextelite/TimeSubnav";

export default async function TimeLayout({ children }: { children: React.ReactNode }) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Zeiterfassung"
    >
      <TimeSubnav showCompanyTime={canManageMembers(context.currentUser.role)} />
      {children}
    </AppShellNextElite>
  );
}
