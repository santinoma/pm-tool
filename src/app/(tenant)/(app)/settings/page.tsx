import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Blocks,
  Building2,
  CalendarDays,
  CheckSquare,
  Code2,
  CreditCard,
  History,
  IdCard,
  KeyRound,
  Lock,
  Palette,
  Puzzle,
  SettingsIcon,
  ShieldCheck,
  Tag,
  Trash2,
  UserCircle,
  Users,
  Webhook,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { Badge } from "@/ui/shadcn/components/badge";
import { Card } from "@/ui/shadcn/components/card";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { t, type Locale } from "@/tenant/i18n/dictionary";
import type { FeatureKey } from "@/tenant/entitlements/features";

export const dynamic = "force-dynamic";

function getGroups(locale: Locale) {
  return [
    {
      title: t(locale, "settings.group.myProfile"),
      items: [
        { href: "/settings/account", label: t(locale, "settings.account.title"), desc: t(locale, "settings.account.desc"), icon: UserCircle },
        { href: "/settings/notifications", label: t(locale, "settings.notifications.title"), desc: t(locale, "settings.notifications.desc"), icon: SettingsIcon, placeholder: true },
        { href: "/settings/security", label: t(locale, "settings.security.title"), desc: t(locale, "settings.security.desc"), icon: ShieldCheck },
        { href: "/settings/appearance", label: t(locale, "settings.appearance.title"), desc: t(locale, "settings.appearance.desc"), icon: Palette, placeholder: true },
      ],
    },
    {
      title: t(locale, "settings.group.organization"),
      items: [
        { href: "/settings/organization", label: t(locale, "settings.orgGeneral.title"), desc: t(locale, "settings.orgGeneral.desc"), icon: SettingsIcon },
        { href: "/settings/organization/clients", label: t(locale, "settings.clients.title"), desc: t(locale, "settings.clients.desc"), icon: Building2 },
        { href: "/settings/time-tracking", label: t(locale, "settings.timeTracking.title"), desc: t(locale, "settings.timeTracking.desc"), icon: History },
        { href: "/settings/organization/service-types", label: t(locale, "settings.serviceTypes.title"), desc: t(locale, "settings.serviceTypes.desc"), icon: Tag },
        { href: "/settings/organization/rate-cards", label: t(locale, "settings.rateCards.title"), desc: t(locale, "settings.rateCards.desc"), icon: CreditCard },
        { href: "/settings/organization/holiday-calendars", label: t(locale, "settings.holidayCalendars.title"), desc: t(locale, "settings.holidayCalendars.desc"), icon: CalendarDays },
        { href: "/settings/organization/recycle-bin", label: t(locale, "settings.recycleBin.title"), desc: t(locale, "settings.recycleBin.desc"), icon: Trash2, placeholder: true },
      ],
    },
    {
      title: t(locale, "settings.group.modulesAutomation"),
      items: [
        { href: "/settings/organization/modules", label: t(locale, "settings.modules.title"), desc: t(locale, "settings.modules.desc"), icon: Blocks, managerOnly: true },
        { href: "/settings/organization/workflows", label: t(locale, "settings.workflows.title"), desc: t(locale, "settings.workflows.desc"), icon: Workflow },
        { href: "/settings/organization/pipelines", label: t(locale, "settings.pipelines.title"), desc: t(locale, "settings.pipelines.desc"), icon: Workflow },
        { href: "/settings/organization/custom-fields", label: t(locale, "settings.customFields.title"), desc: t(locale, "settings.customFields.desc"), icon: Tag },
        { href: "/settings/organization/approval-policies", label: t(locale, "settings.approvalPolicies.title"), desc: t(locale, "settings.approvalPolicies.desc"), icon: CheckSquare },
        { href: "/settings/organization/automations", label: t(locale, "settings.automations.title"), desc: t(locale, "settings.automations.desc"), icon: Zap, feature: "automation_rules" },
        { href: "/settings/webhooks", label: t(locale, "settings.webhooks.title"), desc: t(locale, "settings.webhooks.desc"), icon: Webhook },
        {
          href: "/settings/organization/integrations",
          label: t(locale, "settings.integrations.title"),
          desc: t(locale, "settings.integrations.desc"),
          icon: Puzzle,
          feature: "integrations_marketplace",
        },
        { href: "/settings/organization/api-docs", label: t(locale, "settings.apiDocs.title"), desc: t(locale, "settings.apiDocs.desc"), icon: Code2 },
      ],
    },
    {
      title: t(locale, "settings.group.securityAccess"),
      items: [
        { href: "/settings/organization/roles", label: t(locale, "settings.roles.title"), desc: t(locale, "settings.roles.desc"), icon: KeyRound, feature: "custom_roles" },
        { href: "/settings/organization/sso", label: t(locale, "settings.sso.title"), desc: t(locale, "settings.sso.desc"), icon: Lock },
        { href: "/settings/organization/audit-log", label: t(locale, "settings.auditLog.title"), desc: t(locale, "settings.auditLog.desc"), icon: History },
      ],
    },
    {
      title: t(locale, "settings.group.users"),
      items: [
        { href: "/members", label: t(locale, "settings.membersLink.title"), desc: t(locale, "settings.membersLink.desc"), icon: Users },
        { href: "/settings/users/employee-fields", label: t(locale, "settings.employeeFields.title"), desc: t(locale, "settings.employeeFields.desc"), icon: IdCard, placeholder: true },
      ],
    },
  ];
}

function SettingsCard({
  href,
  label,
  desc,
  icon: Icon,
  placeholder,
}: {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  placeholder?: boolean;
}) {
  return (
    <Link href={href} className="block h-full">
      <Card className="flex h-full flex-row items-start gap-3 p-4 transition-colors hover:border-primary/40 hover:bg-accent/40">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {label}
            {placeholder && (
              <Badge variant="warningOutline" className="text-[10px]">
                Bald
              </Badge>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
        </div>
      </Card>
    </Link>
  );
}

export default async function SettingsHubPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  const currentUser = context.currentUser;
  const locale = currentUser.locale;
  const groups = getGroups(locale);

  return (
    <AppShellNextElite
      currentUser={{ name: currentUser.name, email: currentUser.email, avatarUrl: currentUser.avatarUrl, role: currentUser.role, locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle={t(locale, "settings.title")}
    >
      <div className="mx-auto max-w-5xl pb-10">
        <h1 className="mb-8 text-2xl font-bold tracking-tight">{t(locale, "settings.title")}</h1>
        {groups.map((group) => (
          <div key={group.title} className="mb-8">
            <div className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.title}</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items
                .filter((item) => {
                  const feature = "feature" in item ? (item.feature as FeatureKey) : undefined;
                  if (feature && !context.entitledFeatures.has(feature)) return false;
                  const managerOnly = "managerOnly" in item ? Boolean(item.managerOnly) : false;
                  return !managerOnly || canManageMembers(currentUser.role);
                })
                .map((item) => (
                  <SettingsCard
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    desc={item.desc}
                    icon={item.icon}
                    placeholder={"placeholder" in item ? Boolean(item.placeholder) : false}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </AppShellNextElite>
  );
}
