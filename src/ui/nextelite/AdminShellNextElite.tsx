"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/ui/shadcn/components/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/ui/shadcn/components/breadcrumb";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/ui/shadcn/components/navigation-menu";
import { ThemeToggle } from "@/ui/shadcn/components/theme-toggle";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Building2;
}

// Tabs' underline look (see tabs.tsx) applied to NavigationMenu's link —
// same "Navigation Menu combined with Tabs" treatment as AppShellNextElite.
const navLinkClass =
  "h-11 flex-row items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-3 font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground data-[active=true]:border-primary data-[active=true]:bg-transparent data-[active=true]:text-primary";

const NAV: NavItem[] = [{ href: "/v3/tenants", label: "Tenants", icon: Building2 }];

const PAGE_TITLES: Record<string, string> = {
  "/v3/tenants": "Tenants",
};

function pageTitleFor(pathname: string | null) {
  const match = NAV.find((item) => pathname?.startsWith(item.href));
  return match ? (PAGE_TITLES[match.href] ?? match.label) : "Platform Administration";
}

export function AdminShellNextElite({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-app-header shrink-0 items-center gap-3 border-b border-border/40 bg-muted/70 px-4 sm:px-6 lg:px-8 dark:border-border/60 dark:bg-background">
        <Link href="/tenants" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">PM</div>
          <span className="truncate text-lg font-semibold">PM · Admin</span>
        </Link>

        <NavigationMenu viewport={false} className="min-w-0 max-w-none flex-1 justify-start">
          <NavigationMenuList className="h-11 w-full justify-start gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = pathname?.startsWith(item.href);
              return (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuLink asChild active={isActive} className={navLinkClass}>
                    <Link href={item.href}>
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden md:block">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitleFor(pathname)}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground sm:flex">
            <span className="size-1.5 rounded-full bg-success" />
            Platform Admin
          </div>
          <ThemeToggle />
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">A</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main className="flex-1 px-4 pb-12 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
