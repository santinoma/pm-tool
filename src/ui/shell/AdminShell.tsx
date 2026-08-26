export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-wordmark">
          PM<span>·</span>Admin
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
