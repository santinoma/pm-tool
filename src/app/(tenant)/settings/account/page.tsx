import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShell } from "@/ui/shell/AppShell";
import { AvatarSettingsClient } from "./AvatarSettingsClient";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <div className="container" style={{ maxWidth: "480px" }}>
        <h1 style={{ marginBottom: "var(--space-6)" }}>Account</h1>

        <AvatarSettingsClient
          name={context.currentUser.name}
          email={context.currentUser.email}
          avatarUrl={context.currentUser.avatarUrl}
        />

        <div className="field" style={{ marginBottom: "var(--space-5)", marginTop: "var(--space-8)" }}>
          <span className="field-label">Name</span>
          <p>{context.currentUser.name ?? "—"}</p>
        </div>
        <div className="field" style={{ marginBottom: "var(--space-5)" }}>
          <span className="field-label">E-Mail</span>
          <p>{context.currentUser.email}</p>
        </div>
        <div className="field" style={{ marginBottom: "var(--space-5)" }}>
          <span className="field-label">Rolle</span>
          <p>{context.currentUser.role}</p>
        </div>
        <p className="text-muted">
          Bearbeiten von Sprache, Zeitzone und weiteren Kontodetails folgt in einem kommenden Modul.
        </p>
      </div>
    </AppShell>
  );
}
