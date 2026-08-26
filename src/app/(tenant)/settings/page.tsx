import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShell } from "@/ui/shell/AppShell";
import type { FeatureKey } from "@/tenant/entitlements/features";

export const dynamic = "force-dynamic";

const GROUPS = [
  {
    title: "My Settings",
    items: [
      { href: "/settings/account", label: "Account", desc: "Bearbeite deine Kontoinformationen." },
      { href: "/settings/notifications", label: "Notifications", desc: "Passe an, welche Benachrichtigungen du erhältst." },
      { href: "/settings/security", label: "Security", desc: "Passwort ändern, Aktivitäten und Sitzungen verwalten." },
      { href: "/settings/appearance", label: "Appearance", desc: "Passe das Erscheinungsbild deines Workspaces an." },
    ],
  },
  {
    title: "Organization",
    items: [
      { href: "/settings/organization", label: "General", desc: "Währung, Triage und weitere Grundeinstellungen." },
      { href: "/settings/time-tracking", label: "Zeiterfassung", desc: "Zeituhr oder Zeiteintragungen konfigurieren." },
      { href: "/settings/organization/service-types", label: "Service types", desc: "Verwalte Leistungstypen, die dein Unternehmen anbietet." },
      { href: "/settings/organization/recycle-bin", label: "Recycle bin", desc: "Finde und stelle gelöschte Elemente wieder her." },
      { href: "/settings/organization/workflows", label: "Workflows", desc: "Erstelle und bearbeite Gruppen von Task-Status." },
      { href: "/settings/organization/automations", label: "Automations", desc: "Erstelle Automationen für Updates, Benachrichtigungen oder Zuweisungen.", feature: "automation_rules" },
      { href: "/settings/webhooks", label: "Webhooks", desc: "Externe Systeme über Ereignisse benachrichtigen." },
      { href: "/settings/organization/integrations", label: "Integrations", desc: "Vordefinierte Integrationen installieren (Slack, Zapier, Custom Webhook).", feature: "integrations_marketplace" },
      { href: "/settings/organization/roles", label: "Rollen & Rechte", desc: "Eigene Rollen mit granularen Berechtigungen anlegen.", feature: "custom_roles" },
    ],
  },
  {
    title: "Users",
    items: [
      { href: "/members", label: "Mitglieder", desc: "Verwalte Nutzer oder lade neue ein." },
      { href: "/settings/users/employee-fields", label: "Employee fields", desc: "Richte eure Personaldaten-Felder ein." },
    ],
  },
];

export default async function SettingsHubPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <div className="container" style={{ maxWidth: "640px" }}>
        <h1 style={{ marginBottom: "var(--space-8)" }}>Einstellungen</h1>
        {GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: "var(--space-8)" }}>
            <div className="settings-group-title">{group.title}</div>
            <ul className="settings-list">
              {group.items
                .filter((item) => {
                  const feature = "feature" in item ? (item.feature as FeatureKey) : undefined;
                  return !feature || context.entitledFeatures.has(feature);
                })
                .map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>
                    {item.label}
                    <span className="settings-item-desc">{item.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
