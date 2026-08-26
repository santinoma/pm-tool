import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { PortalShell } from "@/ui/shell/PortalShell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  return (
    <PortalShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email }}>
      {children}
    </PortalShell>
  );
}
