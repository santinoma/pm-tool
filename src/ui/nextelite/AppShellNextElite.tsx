"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarOff,
  CheckCircle2,
  Clock,
  Contact2,
  FileText,
  FolderKanban,
  Gauge,
  HandCoins,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  Network,
  NotebookText,
  Plus,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Square,
  Star,
  Timer as TimerIcon,
  TrendingUp,
  Users,
  Users2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/ui/shadcn/components/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/ui/shadcn/components/breadcrumb";
import { Button } from "@/ui/shadcn/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/shadcn/components/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/ui/shadcn/components/navigation-menu";
import { Sheet, SheetContent, SheetTitle } from "@/ui/shadcn/components/sheet";
import { ThemeToggle } from "@/ui/shadcn/components/theme-toggle";
import { cn } from "@/ui/shadcn/lib/utils";
import { canManageMembers, type RoleName } from "@/tenant/auth/roleGuard";
import { t, type Locale } from "@/tenant/i18n/dictionary";

interface NavRecentItem {
  href: string;
  label: string;
}

interface NavRecent {
  title: string;
  items: NavRecentItem[];
  showAllHref: string;
  showAllLabel: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  feature?: string;
  managerOnly?: boolean;
  // Shown in the dropdown's right column while this item is hovered.
  recent?: NavRecent;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface FavoriteNavEntry {
  id: string;
  entityType: string;
  title: string | null;
  href: string | null;
}

interface RecentNavData {
  tasks: NavRecentItem[];
  docs: NavRecentItem[];
  projects: NavRecentItem[];
  meetings: NavRecentItem[];
  deals: NavRecentItem[];
  contacts: NavRecentItem[];
  companies: NavRecentItem[];
  reports: NavRecentItem[];
}

interface RecentFinancialsNavData {
  budgets: NavRecentItem[];
  expenses: NavRecentItem[];
  invoices: NavRecentItem[];
  purchaseOrders: NavRecentItem[];
  payments: NavRecentItem[];
}

const EMPTY_RECENT_NAV_DATA: RecentNavData = {
  tasks: [],
  docs: [],
  projects: [],
  meetings: [],
  deals: [],
  contacts: [],
  companies: [],
  reports: [],
};
const EMPTY_RECENT_FINANCIALS_NAV_DATA: RecentFinancialsNavData = {
  budgets: [],
  expenses: [],
  invoices: [],
  purchaseOrders: [],
  payments: [],
};

function getTimeMenu(locale: Locale): NavItem[] {
  return [
    { href: "/time", label: t(locale, "nav.myTime"), icon: Clock },
    { href: "/time/absence", label: t(locale, "nav.bookAbsence"), icon: CalendarOff },
    { href: "/time/company", label: t(locale, "nav.companyTime"), icon: Building2, managerOnly: true },
  ];
}

function getReportItems(locale: Locale): NavItem[] {
  return [
    { href: "/reports/overdue", label: t(locale, "nav.reportsOverdue"), icon: AlertCircle },
    { href: "/reports/progress", label: t(locale, "nav.reportsProgress"), icon: TrendingUp },
    { href: "/reports/builder", label: t(locale, "nav.reportsBuilder"), icon: BarChart3 },
  ];
}

function getFooterItems(locale: Locale): NavItem[] {
  return [
    { href: "/members", label: t(locale, "nav.members"), icon: Users },
    { href: "/notifications", label: t(locale, "nav.notifications"), icon: Bell },
    { href: "/settings", label: t(locale, "nav.settings"), icon: Settings },
  ];
}

function isItemActive(pathname: string | null, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname?.startsWith(`${href}/`));
}

function isGroupActive(pathname: string | null, group: NavGroup) {
  return group.items.some((item) => isItemActive(pathname, item.href));
}

// Tabs' underline look (see tabs.tsx) applied to NavigationMenu's
// trigger/link, per the "Navigation Menu combined with Tabs" direction from
// the Next-Elite UI-components showcase — NavigationMenu keeps the real
// dropdown/menu semantics and behavior, Tabs only lends the visual style.
const navTriggerClass =
  "h-11 shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-2 text-sm font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=open]:border-primary data-[state=open]:bg-transparent data-[state=open]:text-primary xl:px-3";
const navLinkClass =
  "h-11 shrink-0 flex-row items-center gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-2 text-sm font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground data-[active=true]:border-primary data-[active=true]:bg-transparent data-[active=true]:text-primary xl:gap-2 xl:px-3";

function NavGroupDropdown({ group, pathname, locale }: { group: NavGroup; pathname: string | null; locale: Locale }) {
  const hasRecent = group.items.some((item) => item.recent);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const activeItem = group.items.find((item) => item.href === hoveredHref) ?? group.items[0];
  const recent = activeItem?.recent;

  return (
    <div className={cn("flex gap-4", hasRecent && "min-w-[36rem]")}>
      <ul className="grid w-64 shrink-0 gap-1">
        {group.items.map((item) => {
          const Icon = item.icon;
          const itemActive = isItemActive(pathname, item.href);
          return (
            <li key={item.href} onMouseEnter={() => setHoveredHref(item.href)}>
              <NavigationMenuLink asChild active={itemActive}>
                <Link href={item.href} className="flex-row items-center gap-2.5">
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </NavigationMenuLink>
            </li>
          );
        })}
      </ul>

      {hasRecent && recent && (
        <div className="w-72 shrink-0 border-s border-border/60 ps-4">
          <div className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{recent.title}</div>
          {recent.items.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">{t(locale, "nav.nothingRecent")}</p>
          ) : (
            <ul className="grid gap-1">
              {recent.items.map((item, index) => (
                <li key={`${item.href}-${index}`}>
                  <NavigationMenuLink asChild>
                    <Link href={item.href} className="flex-row items-center">
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={recent.showAllHref}
            className="mt-2 flex items-center gap-1.5 rounded-md px-1 py-1.5 text-sm font-medium text-primary hover:underline"
          >
            {recent.showAllLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

function DesktopNav({ groups, pathname, locale }: { groups: NavGroup[]; pathname: string | null; locale: Locale }) {
  return (
    <NavigationMenu viewport={false} className="min-w-0 max-w-none flex-1 justify-start">
      <NavigationMenuList className="h-11 w-full justify-start gap-1">
        {groups.map((group) => {
          if (group.items.length === 1) {
            const item = group.items[0];
            const active = isItemActive(pathname, item.href);
            return (
              <NavigationMenuItem key={group.label}>
                <NavigationMenuLink asChild active={active} className={navLinkClass}>
                  <Link href={item.href}>{item.label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          }

          const active = isGroupActive(pathname, group);
          return (
            <NavigationMenuItem key={group.label}>
              <NavigationMenuTrigger
                data-active={active || undefined}
                className={cn(navTriggerClass, active && "border-primary text-primary")}
              >
                {group.label}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavGroupDropdown group={group} pathname={pathname} locale={locale} />
              </NavigationMenuContent>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function MobileNav({ groups, pathname, onNavigate }: { groups: NavGroup[]; pathname: string | null; onNavigate: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.label}</div>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-10 items-center gap-2.5 rounded-md px-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-primary/10 hover:text-foreground",
                    active && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  <Icon className="size-4.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

interface RunningTimerEntry {
  id: string;
  startedAt: string;
  label: string;
}

function formatElapsed(startedAt: string): string {
  const totalSeconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Global Timer widget — reference: "Immer erreichbar in der globalen Aktionsleiste
// (⏱) — Start/Stop unabhängig vom aktuellen Screen." Reuses the existing
// /api/tenant/timer(/stop) endpoints the Time module already runs on.
function GlobalTimer({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [entry, setEntry] = useState<RunningTimerEntry | null>(null);
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch("/api/tenant/timer")
        .then((response) => (response.ok ? response.json() : { entry: null }))
        .then((data) => {
          if (!cancelled) setEntry(data.entry ?? null);
        })
        .catch(() => undefined);
    }
    load();
    const pollInterval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    // `elapsed` is only rendered while `entry` is set (see below), so there's
    // nothing to reset when it isn't — just don't start the ticking interval.
    if (!entry) return;
    const tickInterval = setInterval(() => setElapsed(formatElapsed(entry.startedAt)), 1000);
    return () => clearInterval(tickInterval);
  }, [entry]);

  async function handleStop() {
    await fetch("/api/tenant/timer/stop", { method: "POST" });
    setEntry(null);
    router.refresh();
  }

  if (entry) {
    return (
      <Button
        type="button"
        variant="outlineDestructive"
        size="sm"
        onClick={handleStop}
        className="hidden font-mono tabular-nums md:inline-flex"
        title={`${entry.label} — ${t(locale, "nav.stopTimer")}`}
      >
        <Square className="size-3 fill-current" />
        {elapsed || formatElapsed(entry.startedAt)}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="hidden text-muted-foreground md:inline-flex"
      onClick={() => router.push("/time")}
      aria-label={t(locale, "nav.startTimer")}
      title={t(locale, "nav.startTimer")}
    >
      <TimerIcon className="size-4" />
    </Button>
  );
}

export function AppShellNextElite({
  currentUser,
  entitledFeatures = [],
  pageTitle,
  children,
}: {
  currentUser: {
    name: string | null;
    email: string;
    avatarUrl?: string | null;
    role?: RoleName | null;
    locale?: Locale | null;
  };
  entitledFeatures?: string[];
  pageTitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteNavEntry[]>([]);
  const [recentNavData, setRecentNavData] = useState<RecentNavData>(EMPTY_RECENT_NAV_DATA);
  const [recentFinancialsNavData, setRecentFinancialsNavData] = useState<RecentFinancialsNavData>(
    EMPTY_RECENT_FINANCIALS_NAV_DATA,
  );
  const [moduleToggles, setModuleToggles] = useState({ crmEnabled: true, reportsEnabled: true, resourcingEnabled: true });

  const locale = currentUser.locale ?? "de";
  const isManager = currentUser.role ? canManageMembers(currentUser.role) : false;
  const visibleTimeMenu = getTimeMenu(locale).filter((item) => !item.managerOnly || isManager);
  const hasFinancialsFeature = entitledFeatures.includes("budgets_financials");
  const hasPortfoliosFeature = entitledFeatures.includes("portfolios_goals");
  const navLabels = {
    home: t(locale, "nav.home"),
    projectManagement: t(locale, "nav.projectManagement"),
    time: t(locale, "nav.time"),
    financials: t(locale, "nav.financials"),
    resourcing: t(locale, "nav.resourcing"),
    crm: t(locale, "nav.crm"),
    reports: t(locale, "nav.reports"),
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tenant/nav/recent")
      .then((response) => (response.ok ? response.json() : EMPTY_RECENT_NAV_DATA))
      .then((data) => {
        if (!cancelled) setRecentNavData({ ...EMPTY_RECENT_NAV_DATA, ...data });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasFinancialsFeature) return;
    let cancelled = false;
    fetch("/api/tenant/financials/nav-budgets")
      .then((response) => (response.ok ? response.json() : EMPTY_RECENT_FINANCIALS_NAV_DATA))
      .then((data) => {
        if (!cancelled) setRecentFinancialsNavData({ ...EMPTY_RECENT_FINANCIALS_NAV_DATA, ...data });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hasFinancialsFeature]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tenant/tenant-settings")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.settings) {
          setModuleToggles({
            crmEnabled: data.settings.crmEnabled,
            reportsEnabled: data.settings.reportsEnabled,
            resourcingEnabled: data.settings.resourcingEnabled,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    function loadFavorites() {
      fetch("/api/tenant/favorites")
        .then((response) => (response.ok ? response.json() : { favorites: [] }))
        .then((data) => {
          if (!cancelled) setFavorites(data.favorites ?? []);
        })
        .catch(() => undefined);
    }
    loadFavorites();
    window.addEventListener("favorites-changed", loadFavorites);
    return () => {
      cancelled = true;
      window.removeEventListener("favorites-changed", loadFavorites);
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/tenant/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const groups: NavGroup[] = [
    { label: navLabels.home, items: [{ href: "/dashboard", label: navLabels.home, icon: LayoutDashboard }] },
    {
      label: navLabels.projectManagement,
      items: [
        {
          href: "/my-tasks",
          label: t(locale, "nav.tasks"),
          icon: ListChecks,
          recent: {
            title: t(locale, "nav.recentTasks"),
            items: recentNavData.tasks,
            showAllHref: "/my-tasks",
            showAllLabel: t(locale, "nav.showAllTasks"),
          },
        },
        {
          href: "/docs",
          label: t(locale, "nav.docs"),
          icon: NotebookText,
          recent: {
            title: t(locale, "nav.recentDocs"),
            items: recentNavData.docs,
            showAllHref: "/docs",
            showAllLabel: t(locale, "nav.showAllDocs"),
          },
        },
        {
          href: "/projects",
          label: t(locale, "nav.projects"),
          icon: FolderKanban,
          recent: {
            title: t(locale, "nav.recentProjects"),
            items: recentNavData.projects,
            showAllHref: "/projects",
            showAllLabel: t(locale, "nav.showAllProjects"),
          },
        },
        {
          href: "/meetings",
          label: t(locale, "nav.meetings"),
          icon: Users2,
          recent: {
            title: t(locale, "nav.recentMeetings"),
            items: recentNavData.meetings,
            showAllHref: "/meetings",
            showAllLabel: t(locale, "nav.showAllMeetings"),
          },
        },
      ],
    },
    { label: navLabels.time, items: visibleTimeMenu },
    ...(hasFinancialsFeature
      ? [
          {
            label: navLabels.financials,
            items: [
              {
                href: "/financials",
                label: t(locale, "nav.budgets"),
                icon: Wallet,
                recent: {
                  title: t(locale, "nav.recentBudgets"),
                  items: recentFinancialsNavData.budgets,
                  showAllHref: "/financials",
                  showAllLabel: t(locale, "nav.showAllBudgets"),
                },
              },
              {
                href: "/expenses",
                label: t(locale, "nav.expenses"),
                icon: Receipt,
                recent: {
                  title: t(locale, "nav.recentExpenses"),
                  items: recentFinancialsNavData.expenses,
                  showAllHref: "/expenses",
                  showAllLabel: t(locale, "nav.showAllExpenses"),
                },
              },
              {
                href: "/invoices",
                label: t(locale, "nav.invoices"),
                icon: FileText,
                recent: {
                  title: t(locale, "nav.recentInvoices"),
                  items: recentFinancialsNavData.invoices,
                  showAllHref: "/invoices",
                  showAllLabel: t(locale, "nav.showAllInvoices"),
                },
              },
              {
                href: "/purchase-orders",
                label: t(locale, "nav.purchaseOrders"),
                icon: ShoppingCart,
                recent: {
                  title: t(locale, "nav.recentPurchaseOrders"),
                  items: recentFinancialsNavData.purchaseOrders,
                  showAllHref: "/purchase-orders",
                  showAllLabel: t(locale, "nav.showAllPurchaseOrders"),
                },
              },
              {
                href: "/payments",
                label: t(locale, "nav.payments"),
                icon: Landmark,
                recent: {
                  title: t(locale, "nav.recentPayments"),
                  items: recentFinancialsNavData.payments,
                  showAllHref: "/payments",
                  showAllLabel: t(locale, "nav.showAllPayments"),
                },
              },
            ],
          },
        ]
      : []),
    ...(moduleToggles.resourcingEnabled
      ? [
          {
            label: navLabels.resourcing,
            items: [
              { href: "/resource-planning", label: t(locale, "nav.resourcePlanner"), icon: Gauge },
              { href: "/members", label: t(locale, "nav.employees"), icon: Users },
              { href: "/members/org-chart", label: t(locale, "nav.orgChart"), icon: Network },
            ],
          },
        ]
      : []),
    ...(moduleToggles.crmEnabled
      ? [
          {
            label: navLabels.crm,
            items: [
              {
                href: "/crm/deals",
                label: t(locale, "nav.deals"),
                icon: HandCoins,
                recent: {
                  title: t(locale, "nav.recentDeals"),
                  items: recentNavData.deals,
                  showAllHref: "/crm/deals",
                  showAllLabel: t(locale, "nav.showAllDeals"),
                },
              },
              {
                href: "/crm/contacts",
                label: t(locale, "nav.contacts"),
                icon: Contact2,
                recent: {
                  title: t(locale, "nav.recentContacts"),
                  items: recentNavData.contacts,
                  showAllHref: "/crm/contacts",
                  showAllLabel: t(locale, "nav.showAllContacts"),
                },
              },
              {
                href: "/crm/companies",
                label: t(locale, "nav.companies"),
                icon: Building2,
                recent: {
                  title: t(locale, "nav.recentCompanies"),
                  items: recentNavData.companies,
                  showAllHref: "/crm/companies",
                  showAllLabel: t(locale, "nav.showAllCompanies"),
                },
              },
            ],
          },
        ]
      : []),
    ...(moduleToggles.reportsEnabled
      ? [
          {
            label: navLabels.reports,
            items: [
              {
                href: "/reports",
                label: t(locale, "nav.reportsItem"),
                icon: BarChart3,
                recent: {
                  title: t(locale, "nav.recentReports"),
                  items: recentNavData.reports,
                  showAllHref: "/reports",
                  showAllLabel: t(locale, "nav.showAllReports"),
                },
              },
              ...getReportItems(locale),
            ],
          },
        ]
      : []),
    ...(hasPortfoliosFeature
      ? [{ label: t(locale, "nav.more"), items: [{ href: "/portfolios", label: t(locale, "nav.portfolios"), icon: Briefcase }] }]
      : []),
  ];

  const brand = (
    <Link href="/dashboard" className="flex min-w-0 shrink-0 items-center gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">PM</div>
      <span className="truncate text-lg font-semibold">PM · Atlas</span>
    </Link>
  );

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-app-header shrink-0 items-center gap-3 border-b border-border/40 bg-muted/70 px-4 sm:px-6 lg:px-8 dark:border-border/60 dark:bg-background">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label={t(locale, "nav.openNavigation")}
        >
          <Menu className="size-4" />
        </Button>

        {brand}

        <div className="hidden min-w-0 flex-1 md:flex">
          <DesktopNav groups={groups} pathname={pathname} locale={locale} />
        </div>

        <div className="flex flex-1 items-center justify-end gap-1.5 md:flex-none">
          <div className="md:hidden">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageTitle ?? "PM · Atlas"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Global action bar, reference order: Quick add / Timer / Email inbox / Approvals / Search / Help / Account. */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette", { detail: "create" }))}
            aria-label={t(locale, "nav.quickAdd")}
            title={t(locale, "nav.quickAdd")}
          >
            <Plus className="size-4" />
          </Button>

          <GlobalTimer locale={locale} />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled
            className="hidden text-muted-foreground/50 md:inline-flex"
            aria-label={t(locale, "nav.emailInboxComingSoon")}
            title={t(locale, "nav.emailInboxComingSoon")}
          >
            <Mail className="size-4" />
          </Button>

          {isManager && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="hidden text-muted-foreground md:inline-flex"
              asChild
            >
              <Link href="/time" aria-label={t(locale, "nav.approvals")} title={t(locale, "nav.approvals")}>
                <CheckCircle2 className="size-4" />
              </Link>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hidden text-muted-foreground md:inline-flex"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette", { detail: "search" }))}
            aria-label={t(locale, "nav.search")}
            title={t(locale, "nav.search")}
          >
            <Search className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hidden text-muted-foreground md:inline-flex"
            asChild
          >
            <Link href="/settings/organization/api-docs" aria-label={t(locale, "nav.help")} title={t(locale, "nav.help")}>
              <HelpCircle className="size-4" />
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t(locale, "nav.favorites")} className="text-muted-foreground">
                <Star className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {favorites.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">{t(locale, "nav.noFavoritesYet")}</div>
              ) : (
                favorites
                  .filter((favorite) => favorite.href)
                  .map((favorite) => (
                    <DropdownMenuItem key={favorite.id} asChild>
                      <Link href={favorite.href!}>{favorite.title ?? "—"}</Link>
                    </DropdownMenuItem>
                  ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1 border-e border-border/40 pe-3">
            <ThemeToggle />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="rounded-full" aria-label={t(locale, "nav.accountMenu")}>
                <Avatar className="size-8">
                  <AvatarImage src={currentUser.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                    {(currentUser.name ?? currentUser.email).slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5 text-sm font-medium">{currentUser.name ?? currentUser.email}</div>
              <DropdownMenuSeparator />
              {getFooterItems(locale).map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>
                      <Icon /> {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                <LogOut /> Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-app-header items-center gap-2.5 border-b px-4">{brand}</div>
          <MobileNav groups={groups} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 px-4 pb-12 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
