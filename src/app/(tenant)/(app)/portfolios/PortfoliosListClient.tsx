"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";

interface PortfolioRow {
  id: string;
  name: string;
  projectCount: number;
  goalCount: number;
  progress: number;
}

export function PortfoliosListClient({
  portfolios,
  canManage,
  allProjects,
}: {
  portfolios: PortfolioRow[];
  canManage: boolean;
  allProjects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Portfolio konnte nicht angelegt werden.");
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div className="pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Portfolios</h1>
        <p className="mt-1 text-sm text-muted-foreground">Projekte zu übergreifenden Zielen bündeln.</p>
      </div>

      {allProjects.length === 0 && <p className="mb-4 text-sm text-muted-foreground">Es existieren noch keine Projekte.</p>}

      {portfolios.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Noch keine Portfolios.</p>
      ) : (
        <ul className="mb-8 flex flex-col gap-1">
          {portfolios.map((portfolio) => (
            <li key={portfolio.id} className="flex items-center justify-between gap-3 border-b py-2.5 text-sm last:border-0">
              <Link href={`/portfolios/${portfolio.id}`} className="font-medium hover:text-primary hover:underline">
                {portfolio.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {portfolio.projectCount} Projekte · {portfolio.goalCount} Ziele · {portfolio.progress}% erledigt
              </span>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <h2 className="mb-4 text-lg font-semibold">Neues Portfolio</h2>
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required className="w-64" />
            <Button type="submit" loading={saving}>
              Anlegen
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
