import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { AvatarSettingsClient } from "./AvatarSettingsClient";
import { LocaleSettingsClient } from "./LocaleSettingsClient";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  const locale = context.currentUser.locale;

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Account"
    >
      <div className="mx-auto max-w-xl pb-10">
        <h1 className="mb-8 text-2xl font-bold tracking-tight">Account</h1>

        <AvatarSettingsClient
          name={context.currentUser.name}
          email={context.currentUser.email}
          avatarUrl={context.currentUser.avatarUrl}
        />

        <div className="mt-8 flex flex-col gap-5">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase">Name</span>
            <p className="mt-1 text-sm">{context.currentUser.name ?? "—"}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase">E-Mail</span>
            <p className="mt-1 text-sm">{context.currentUser.email}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase">{locale === "en" ? "Role" : "Rolle"}</span>
            <p className="mt-1 text-sm">{context.currentUser.role}</p>
          </div>
        </div>

        <div className="mt-8">
          <LocaleSettingsClient locale={locale} />
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          {locale === "en"
            ? "Editing timezone and other account details is coming in a future module."
            : "Bearbeiten von Zeitzone und weiteren Kontodetails folgt in einem kommenden Modul."}
        </p>
      </div>
    </AppShellNextElite>
  );
}
