"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Contact2, Gauge } from "lucide-react";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Switch } from "@/ui/shadcn/components/switch";

interface ModuleDef {
  key: "crmEnabled" | "reportsEnabled" | "resourcingEnabled";
  label: string;
  desc: string;
  icon: typeof Contact2;
}

const MODULES: ModuleDef[] = [
  {
    key: "resourcingEnabled",
    label: "Resourcing",
    desc: "Ressourcenplanung: Auslastung und Buchungen über alle Projekte hinweg.",
    icon: Gauge,
  },
  {
    key: "crmEnabled",
    label: "CRM",
    desc: "Deals, Contacts und Companies für die Vertriebspipeline.",
    icon: Contact2,
  },
  {
    key: "reportsEnabled",
    label: "Reports",
    desc: "Berichte-Bibliothek, Fortschritt und individuell erstellbare Auswertungen.",
    icon: Briefcase,
  },
];

export function ModulesSettingsClient({
  crmEnabled,
  reportsEnabled,
  resourcingEnabled,
}: {
  crmEnabled: boolean;
  reportsEnabled: boolean;
  resourcingEnabled: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState({ crmEnabled, reportsEnabled, resourcingEnabled });
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(key: ModuleDef["key"], next: boolean) {
    setState((prev) => ({ ...prev, [key]: next }));
    setSaving(key);
    await fetch("/api/tenant/tenant-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    });
    setSaving(null);
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Module</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Dashboard, Projektmanagement und Finanzen sind Grundfunktionen und immer aktiv. Die folgenden Module könnt ihr
        organisationsweit aktivieren oder deaktivieren — deaktivierte Module verschwinden aus der Navigation aller
        Mitglieder.
      </p>

      <div className="flex flex-col gap-3">
        {MODULES.map((module) => {
          const Icon = module.icon;
          const enabled = state[module.key];
          return (
            <Card key={module.key} className="flex-row items-center gap-4 p-4">
              <CardContent className="flex flex-1 items-center gap-4 p-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{module.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{module.desc}</div>
                </div>
                <Switch
                  checked={enabled}
                  disabled={saving === module.key}
                  onCheckedChange={(checked) => toggle(module.key, checked)}
                  aria-label={`${module.label} ${enabled ? "deaktivieren" : "aktivieren"}`}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
