import Link from "next/link";

import { Button } from "@/ui/shadcn/components/button";

interface OrgChartUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  managerId: string | null;
}

function OrgChartNode({
  user,
  usersByManagerId,
  depth,
  visited,
}: {
  user: OrgChartUser;
  usersByManagerId: Map<string, OrgChartUser[]>;
  depth: number;
  visited: Set<string>;
}) {
  // Schutz gegen zyklische Daten (sollte durch die Server-seitige Zyklus-Prüfung beim
  // Zuweisen nie vorkommen, aber eine rekursive Ansicht darf sich darauf nicht verlassen).
  if (visited.has(user.id)) {
    return null;
  }
  const nextVisited = new Set(visited).add(user.id);
  const reports = usersByManagerId.get(user.id) ?? [];

  return (
    <li>
      <div className="mb-2 rounded-lg border bg-card p-3" style={{ marginLeft: `${depth * 1.5}rem` }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{user.name ?? user.email}</span>
          <span className="text-xs text-muted-foreground">{user.role}</span>
        </div>
        {user.name && <div className="text-sm text-muted-foreground">{user.email}</div>}
      </div>
      {reports.length > 0 && (
        <ul className="list-none">
          {reports.map((report) => (
            <OrgChartNode key={report.id} user={report} usersByManagerId={usersByManagerId} depth={depth + 1} visited={nextVisited} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChartClient({ users }: { users: OrgChartUser[] }) {
  const usersByManagerId = new Map<string, OrgChartUser[]>();
  for (const user of users) {
    if (!user.managerId) continue;
    const existing = usersByManagerId.get(user.managerId) ?? [];
    existing.push(user);
    usersByManagerId.set(user.managerId, existing);
  }
  const topLevel = users.filter((user) => !user.managerId);

  return (
    <div className="pb-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Org-Chart</h1>
          <p className="mt-1 text-sm text-muted-foreground">Hierarchische Ansicht ausgehend von Mitgliedern ohne Manager.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/members">Zurück zu Mitgliedern</Link>
        </Button>
      </div>

      {topLevel.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Keine Hierarchie hinterlegt</h3>
          <p className="mt-1 text-sm text-muted-foreground">Weise auf der Mitgliederseite Managern direkte Berichte zu.</p>
        </div>
      ) : (
        <ul className="list-none">
          {topLevel.map((user) => (
            <OrgChartNode key={user.id} user={user} usersByManagerId={usersByManagerId} depth={0} visited={new Set()} />
          ))}
        </ul>
      )}
    </div>
  );
}
