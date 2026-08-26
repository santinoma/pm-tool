"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/ui/components/Avatar";
import { canManageMembers, type RoleName } from "@/tenant/auth/roleGuard";

interface NavItem {
  href: string;
  label: string;
  feature?: string;
  managerOnly?: boolean;
}

interface FinancialsNavBudget {
  budgetId: string;
  budgetTitle: string;
  projectId: string;
  projectName: string;
}

const PRIMARY_ITEMS: NavItem[] = [{ href: "/dashboard", label: "Dashboard" }];

const PROJECTS_MENU: NavItem[] = [
  { href: "/my-tasks", label: "Meine Tasks" },
  { href: "/projects", label: "Projekte" },
];

const TIME_MENU: NavItem[] = [
  { href: "/time", label: "Meine Zeit" },
  { href: "/time/absence", label: "Book Absence" },
  { href: "/time/company", label: "Company Time", managerOnly: true },
];

const SECONDARY_ITEMS: NavItem[] = [
  { href: "/portfolios", label: "Portfolios", feature: "portfolios_goals" },
  { href: "/resource-planning", label: "Ressourcenplanung" },
];

const ACCOUNT_MENU: NavItem[] = [
  { href: "/reports/overdue", label: "Überfällig" },
  { href: "/reports/progress", label: "Fortschritt" },
  { href: "/members", label: "Mitglieder" },
  { href: "/notifications", label: "Benachrichtigungen" },
  { href: "/settings", label: "Einstellungen" },
];

export function AppShell({
  currentUser,
  entitledFeatures = [],
  children,
}: {
  currentUser: { name: string | null; email: string; avatarUrl?: string | null; role?: RoleName | null };
  entitledFeatures?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<"projects" | "time" | "financials" | "account" | null>(null);
  const [financialsBudgets, setFinancialsBudgets] = useState<FinancialsNavBudget[]>([]);
  const projectsRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const financialsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Verlässt die Maus den Trigger auf dem Weg zum Panel (diagonal, langsam), feuert
  // mouseleave sofort — das Panel schließt sich, bevor die Maus dort ankommt. Ein
  // kurzes Schließ-Delay überbrückt diese Lücke, statt sofort zu schließen.
  function openHoverMenu(key: "projects" | "time" | "financials") {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpenMenu(key);
  }

  function scheduleHoverMenuClose(key: "projects" | "time" | "financials") {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setOpenMenu((current) => (current === key ? null : current));
      closeTimeoutRef.current = null;
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);
  const visibleSecondaryItems = SECONDARY_ITEMS.filter(
    (item) => !item.feature || entitledFeatures.includes(item.feature),
  );
  const isManager = currentUser.role ? canManageMembers(currentUser.role) : false;
  const visibleTimeMenu = TIME_MENU.filter((item) => !item.managerOnly || isManager);
  const hasFinancialsFeature = entitledFeatures.includes("budgets_financials");

  useEffect(() => {
    if (!hasFinancialsFeature) return;
    let cancelled = false;
    fetch("/api/tenant/financials/nav-budgets")
      .then((response) => (response.ok ? response.json() : { budgets: [] }))
      .then((data) => {
        if (!cancelled) setFinancialsBudgets(data.budgets ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hasFinancialsFeature]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        projectsRef.current?.contains(target) ||
        timeRef.current?.contains(target) ||
        financialsRef.current?.contains(target) ||
        accountRef.current?.contains(target)
      ) {
        return;
      }
      setOpenMenu(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/tenant/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isProjectsActive = PROJECTS_MENU.some((item) => pathname?.startsWith(item.href));
  const isTimeActive = pathname?.startsWith("/time") ?? false;
  const isFinancialsActive = pathname?.startsWith("/financials") ?? false;

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-wordmark">
          PM<span>·</span>Atlas
        </div>
        <nav className="app-topbar-nav">
          {PRIMARY_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`app-nav-item${pathname?.startsWith(item.href) ? " is-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}

          <div
            className="nav-dropdown-wrap"
            ref={projectsRef}
            onMouseEnter={() => openHoverMenu("projects")}
            onMouseLeave={() => scheduleHoverMenuClose("projects")}
          >
            <span className={`app-nav-item${isProjectsActive ? " is-active" : ""}`}>Projekte</span>
            {openMenu === "projects" && (
              <div className="nav-dropdown-panel">
                {PROJECTS_MENU.map((item) => (
                  <Link key={item.href} href={item.href} className="nav-dropdown-item">
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {visibleSecondaryItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`app-nav-item${pathname?.startsWith(item.href) ? " is-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}

          {hasFinancialsFeature &&
            (financialsBudgets.length > 0 ? (
              <div
                className="nav-dropdown-wrap"
                ref={financialsRef}
                onMouseEnter={() => openHoverMenu("financials")}
                onMouseLeave={() => scheduleHoverMenuClose("financials")}
              >
                <span className={`app-nav-item${isFinancialsActive ? " is-active" : ""}`}>Financials</span>
                {openMenu === "financials" && (
                  <div className="nav-dropdown-panel">
                    {financialsBudgets.map((budget) => (
                      <Link
                        key={budget.budgetId}
                        href={`/financials/${budget.projectId}/${budget.budgetId}`}
                        className="nav-dropdown-item"
                      >
                        {budget.projectName} – {budget.budgetTitle}
                      </Link>
                    ))}
                    <div className="nav-dropdown-divider" />
                    <Link href="/financials" className="nav-dropdown-item">
                      Alle Budgets
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/financials" className={`app-nav-item${isFinancialsActive ? " is-active" : ""}`}>
                Financials
              </Link>
            ))}

          <div
            className="nav-dropdown-wrap"
            ref={timeRef}
            onMouseEnter={() => openHoverMenu("time")}
            onMouseLeave={() => scheduleHoverMenuClose("time")}
          >
            <span className={`app-nav-item${isTimeActive ? " is-active" : ""}`}>Zeiterfassung</span>
            {openMenu === "time" && (
              <div className="nav-dropdown-panel">
                {visibleTimeMenu.map((item) => (
                  <Link key={item.href} href={item.href} className="nav-dropdown-item">
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
        <div className="app-topbar-actions">
          <button
            type="button"
            className="app-topbar-search"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          >
            Suchen… <kbd>⌘K</kbd>
          </button>

          <div className="nav-dropdown-wrap" ref={accountRef}>
            <button
              type="button"
              className="nav-account-trigger"
              onClick={() => setOpenMenu(openMenu === "account" ? null : "account")}
              aria-label="Konto-Menü"
            >
              <Avatar name={currentUser.name} email={currentUser.email} avatarUrl={currentUser.avatarUrl} />
            </button>
            {openMenu === "account" && (
              <div className="nav-dropdown-panel align-right">
                <div className="nav-dropdown-label">{currentUser.name ?? currentUser.email}</div>
                {ACCOUNT_MENU.map((item) => (
                  <Link key={item.href} href={item.href} className="nav-dropdown-item">
                    {item.label}
                  </Link>
                ))}
                <div className="nav-dropdown-divider" />
                <button type="button" onClick={handleLogout} className="nav-dropdown-item nav-dropdown-item-button">
                  Abmelden
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
}
