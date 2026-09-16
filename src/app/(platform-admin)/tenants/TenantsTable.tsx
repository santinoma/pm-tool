"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, MoreHorizontal, Power, Search, Server, Trash2, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ui/shadcn/components/dropdown-menu";
import { Input } from "@/ui/shadcn/components/input";
import { DeleteTenantDialog } from "./DeleteTenantButton";
import { ToggleTenantStatusDialog } from "./ToggleTenantStatusButton";
import { SeatLimitDialog } from "./SeatLimitButton";

const PLAN_LABELS: Record<string, string> = {
  small: "Klein",
  medium: "Mittelstand",
  enterprise: "Enterprise",
};

export interface TenantRow {
  id: string;
  name: string;
  subdomain: string;
  status: "active" | "disabled" | string;
  plan: string;
  tier: string;
  seatLimit: number | null;
  createdAtLabel: string;
}

const STAT_TONES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  neutral: "bg-muted text-muted-foreground",
} as const;

function StatCard({
  icon: Icon,
  value,
  label,
  tone = "neutral",
}: {
  icon: typeof Building2;
  value: number;
  label: string;
  tone?: keyof typeof STAT_TONES;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-lg border bg-card p-4">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-md ${STAT_TONES[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl leading-none font-bold">{value}</div>
        <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "•"
  );
}

function TenantRowActions({ tenant }: { tenant: TenantRow }) {
  const [confirmAction, setConfirmAction] = useState<null | "toggle" | "delete" | "seatLimit">(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Aktionen">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setConfirmAction("seatLimit")}>
            <Users />
            Sitzplatz-Limit
          </DropdownMenuItem>
          {(tenant.status === "active" || tenant.status === "disabled") && (
            <DropdownMenuItem onSelect={() => setConfirmAction("toggle")}>
              <Power />
              {tenant.status === "active" ? "Deaktivieren" : "Aktivieren"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmAction("delete")}>
            <Trash2 />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {(tenant.status === "active" || tenant.status === "disabled") && (
        <ToggleTenantStatusDialog
          open={confirmAction === "toggle"}
          onOpenChange={(open) => setConfirmAction(open ? "toggle" : null)}
          tenantId={tenant.id}
          tenantName={tenant.name}
          status={tenant.status as "active" | "disabled"}
        />
      )}
      <SeatLimitDialog
        open={confirmAction === "seatLimit"}
        onOpenChange={(open) => setConfirmAction(open ? "seatLimit" : null)}
        tenantId={tenant.id}
        tenantName={tenant.name}
        seatLimit={tenant.seatLimit}
      />
      <DeleteTenantDialog
        open={confirmAction === "delete"}
        onOpenChange={(open) => setConfirmAction(open ? "delete" : null)}
        tenantId={tenant.id}
        tenantName={tenant.name}
      />
    </>
  );
}

export function TenantsTable({
  tenants,
  stats,
}: {
  tenants: TenantRow[];
  stats: { total: number; active: number; enterprise: number; dedicated: number };
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tenants;
    return tenants.filter(
      (tenant) => tenant.name.toLowerCase().includes(needle) || tenant.subdomain.toLowerCase().includes(needle),
    );
  }, [tenants, query]);

  return (
    <div className="pb-10">
      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard icon={Building2} value={stats.total} label="Tenants gesamt" tone="primary" />
        <StatCard icon={CheckCircle2} value={stats.active} label="Aktiv" tone="success" />
        <StatCard icon={Server} value={stats.enterprise} label="Enterprise" tone="warning" />
        <StatCard icon={Server} value={stats.dedicated} label="Dedizierte Infra" tone="neutral" />
      </div>

      {tenants.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>
          <h3 className="font-semibold">Noch keine Tenants angelegt</h3>
          <p className="max-w-xs text-sm text-muted-foreground">Lege den ersten Kunden-Workspace an, um loszulegen.</p>
          <Button asChild className="mt-2">
            <Link href="/tenants/new">+ Neuer Tenant</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tenant oder Subdomain suchen…"
              className="pl-9"
              aria-label="Tenants durchsuchen"
            />
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="overflow-x-auto">
              {filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Keine Tenants gefunden für „{query}“.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {["Name", "Subdomain", "Status", "Plan", "Sitzplätze", "Infrastruktur", "Erstellt", ""].map((head) => (
                        <th key={head} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((tenant) => (
                      <tr key={tenant.id} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                              {initials(tenant.name)}
                            </div>
                            <span className="font-medium">{tenant.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{tenant.subdomain}</td>
                        <td className="px-4 py-3">
                          <Badge variant={tenant.status === "active" ? "successOutline" : "warningOutline"}>
                            <span className="size-1.5 rounded-full bg-current" />
                            {tenant.status === "active" ? "Aktiv" : "Deaktiviert"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{PLAN_LABELS[tenant.plan] ?? tenant.plan}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {tenant.seatLimit === null ? "Kein Limit" : tenant.seatLimit}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={tenant.tier === "dedicated" ? "destructiveOutline" : "outline"}>
                            {tenant.tier === "dedicated" ? "Dediziert" : "Geteilt"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{tenant.createdAtLabel}</td>
                        <td className="px-4 py-3 text-right">
                          <TenantRowActions tenant={tenant} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
