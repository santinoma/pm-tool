"use client";

import { useRouter } from "next/navigation";

export function PortalShell({
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
    <div className="portal-shell">
      <header className="portal-topbar">
        <div className="portal-wordmark">
          PM<span>·</span>Atlas <span className="text-muted" style={{ fontWeight: 400 }}>Portal</span>
        </div>
        <div className="row" style={{ gap: "var(--space-3)" }}>
          <span className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
            {currentUser.name ?? currentUser.email}
          </span>
          <button type="button" onClick={handleLogout} className="btn btn-ghost btn-sm">
            Abmelden
          </button>
        </div>
      </header>
      <main className="portal-main">{children}</main>
    </div>
  );
}
