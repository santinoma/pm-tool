import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { ThemeProvider } from "@/ui/shadcn/lib/theme-provider";
import { PortalShellNextElite } from "@/ui/nextelite/PortalShellNextElite";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  return (
    <ThemeProvider className="min-h-dvh">
      <PortalShellNextElite currentUser={{ name: context.currentUser.name, email: context.currentUser.email }}>
        {children}
      </PortalShellNextElite>
    </ThemeProvider>
  );
}
