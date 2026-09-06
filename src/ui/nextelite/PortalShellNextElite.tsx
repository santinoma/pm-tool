"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
import { Logo } from "@/ui/nextelite/Logo";

export function PortalShellNextElite({
  currentUser,
  children,
}: {
  currentUser: { name: string | null; email: string };
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/tenant/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-baseline gap-2">
          <Logo className="text-base" />
          <span className="text-sm font-normal text-muted-foreground">Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{currentUser.name ?? currentUser.email}</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleLogout}>
            Abmelden
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
