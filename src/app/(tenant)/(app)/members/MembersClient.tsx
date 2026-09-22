"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LegendKey } from "@/ui/components/LegendKey";
import { Avatar } from "@/ui/components/Avatar";
import { CostRateHistoryDialog, type CostRateEntry } from "./CostRateHistoryDialog";

import { Button } from "@/ui/shadcn/components/button";
import { Card } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/components/dialog";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Badge } from "@/ui/shadcn/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

interface MemberUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  employmentType: string;
  isActive: boolean;
  internalCostRate: number | null;
  customRoleId: string | null;
  defaultSystemSetName: string;
  holidayCalendarId: string | null;
  managerId: string | null;
}

interface HolidayCalendarOption {
  id: string;
  name: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

interface CustomRoleOption {
  id: string;
  name: string;
  isSystem: boolean;
}

interface OwnershipSummary {
  budgets: number;
  managedProjects: number;
  openTasks: number;
  projectMemberships: number;
  automationRules: number;
  resourceBookings: number;
  sharedSavedViews: number;
  privateSavedViews: number;
  savedReports: number;
  apiKeys: number;
}

const OWNERSHIP_LABELS: Record<keyof OwnershipSummary, string> = {
  budgets: "Budgets (Owner)",
  managedProjects: "Verwaltete Projekte",
  openTasks: "Offene Aufgaben",
  projectMemberships: "Projekt-Mitgliedschaften",
  automationRules: "Automation-Regeln",
  resourceBookings: "Ressourcen-Buchungen",
  sharedSavedViews: "Geteilte gespeicherte Ansichten",
  privateSavedViews: "Private gespeicherte Ansichten (werden gelöscht)",
  savedReports: "Gespeicherte Reports",
  apiKeys: "Aktive API-Keys (werden widerrufen)",
};

function OffboardDialog({
  user,
  users,
  onClose,
  onOffboarded,
}: {
  user: MemberUser;
  users: MemberUser[];
  onClose: () => void;
  onOffboarded: () => void;
}) {
  const [summary, setSummary] = useState<OwnershipSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [reassignToUserId, setReassignToUserId] = useState("__none__");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tenant/users/${user.id}/ownership-summary`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setSummary(data.summary);
      })
      .catch(() => {
        if (!cancelled) setError("Ownership-Übersicht konnte nicht geladen werden.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    const response = await fetch(`/api/tenant/users/${user.id}/offboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reassignToUserId: reassignToUserId === "__none__" ? undefined : reassignToUserId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Offboarding fehlgeschlagen.");
      setSubmitting(false);
      return;
    }
    onOffboarded();
  }

  const candidates = users.filter((candidate) => candidate.id !== user.id && candidate.isActive);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user.name ?? user.email} offboarden</DialogTitle>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Lade Ownership-Übersicht …</p>}

        {summary && (
          <div className="flex flex-col gap-1">
            {(Object.keys(OWNERSHIP_LABELS) as (keyof OwnershipSummary)[])
              .filter((key) => summary[key] > 0)
              .map((key) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{OWNERSHIP_LABELS[key]}</span>
                  <span>{summary[key]}</span>
                </div>
              ))}
            {(Object.keys(OWNERSHIP_LABELS) as (keyof OwnershipSummary)[]).every((key) => summary[key] === 0) && (
              <p className="text-sm text-muted-foreground">Dieser Nutzer besitzt aktuell nichts, das übertragen werden müsste.</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="offboard-reassign">Übertragen an (optional)</Label>
          <Select value={reassignToUserId} onValueChange={setReassignToUserId}>
            <SelectTrigger id="offboard-reassign" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— nicht übertragen, nur leeren/entfernen —</SelectItem>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.name ?? candidate.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Abbrechen
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm} loading={loading || submitting}>
            Offboarden bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MembersClient({
  currentUserId,
  canManage,
  users,
  invites,
  projects,
  customRoles,
  holidayCalendars,
  hasCustomRolesFeature,
  hasProjectOverridesFeature,
}: {
  currentUserId: string;
  canManage: boolean;
  users: MemberUser[];
  invites: PendingInvite[];
  projects: { id: string; name: string }[];
  customRoles: CustomRoleOption[];
  holidayCalendars: HolidayCalendarOption[];
  hasCustomRolesFeature: boolean;
  hasProjectOverridesFeature: boolean;
}) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteEmploymentType, setInviteEmploymentType] = useState("employee");
  const [grantedProjectIds, setGrantedProjectIds] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offboardTarget, setOffboardTarget] = useState<MemberUser | null>(null);
  const [costRateHistoryTarget, setCostRateHistoryTarget] = useState<MemberUser | null>(null);
  const [costRateHistoryEntries, setCostRateHistoryEntries] = useState<CostRateEntry[]>([]);

  async function openCostRateHistory(user: MemberUser) {
    const response = await fetch(`/api/tenant/users/${user.id}/cost-rate-history`);
    const data = await response.json();
    setCostRateHistoryEntries(data.entries ?? []);
    setCostRateHistoryTarget(user);
  }

  async function handleCustomRoleChange(userId: string, customRoleId: string) {
    setError(null);
    const response = await fetch(`/api/tenant/users/${userId}/custom-role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customRoleId: customRoleId === "__none__" ? null : customRoleId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Custom Role konnte nicht zugewiesen werden.");
      return;
    }
    router.refresh();
  }

  function toggleProject(projectId: string) {
    setGrantedProjectIds((current) =>
      current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId],
    );
  }

  async function handleRoleChange(userId: string, role: string) {
    setError(null);
    const response = await fetch(`/api/tenant/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Rollenwechsel fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function handleCostRateChange(userId: string, value: string) {
    setError(null);
    const internalCostRate = value.trim() === "" ? null : Number(value);
    const response = await fetch(`/api/tenant/users/${userId}/cost-rate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internalCostRate }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Interner Stundensatz konnte nicht gespeichert werden.");
      return;
    }
    router.refresh();
  }

  async function handleHolidayCalendarChange(userId: string, holidayCalendarId: string) {
    setError(null);
    const response = await fetch(`/api/tenant/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holidayCalendarId: holidayCalendarId === "__none__" ? null : holidayCalendarId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Feiertagskalender konnte nicht zugewiesen werden.");
      return;
    }
    router.refresh();
  }

  async function handleManagerChange(userId: string, managerId: string) {
    setError(null);
    const response = await fetch(`/api/tenant/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: managerId === "__none__" ? null : managerId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Manager konnte nicht zugewiesen werden.");
      return;
    }
    router.refresh();
  }

  async function handleActiveChange(userId: string, isActive: boolean) {
    setError(null);
    const response = await fetch(`/api/tenant/users/${userId}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Aktion fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInviteLink(null);

    const response = await fetch("/api/tenant/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail,
        role: inviteRole,
        employmentType: inviteEmploymentType,
        grantedProjectIds: inviteRole === "client" ? grantedProjectIds : undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Einladung fehlgeschlagen.");
      return;
    }
    setInviteLink(data.inviteUrl);
    setInviteEmail("");
    setGrantedProjectIds([]);
    router.refresh();
  }

  async function handleEmploymentTypeChange(userId: string, employmentType: string) {
    setError(null);
    const response = await fetch(`/api/tenant/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employmentType }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Employment Type konnte nicht geändert werden.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="pb-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Mitglieder ({users.length})</h1>
        <Button variant="outline" asChild>
          <Link href="/members/org-chart">Org-Chart</Link>
        </Button>
      </div>

      <div className="mb-8 overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Permission Set</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Interner Stundensatz</TableHead>
              <TableHead>Feiertagskalender</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Avatar name={user.name} email={user.email} avatarUrl={user.avatarUrl} size={26} />
                    {user.name ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  {canManage && user.id !== currentUserId ? (
                    <Select defaultValue={user.role} onValueChange={(value) => handleRoleChange(user.id, value)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {user.employmentType !== "contractor" && <SelectItem value="owner">owner</SelectItem>}
                        {user.employmentType !== "contractor" && <SelectItem value="admin">admin</SelectItem>}
                        <SelectItem value="member">member</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{user.role}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {canManage && user.id !== currentUserId ? (
                    <Select defaultValue={user.employmentType} onValueChange={(value) => handleEmploymentTypeChange(user.id, value)}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="contractor">Contractor</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">{user.employmentType === "contractor" ? "Contractor" : "Employee"}</span>
                  )}
                </TableCell>
                <TableCell>
                  {(() => {
                    // T402: fehlt ein explizites customRoleId, gilt automatisch das
                    // zur Basis-Rolle passende System-Permission-Set (siehe
                    // getDefaultSystemSetNameForRole) — die Anzeige/Auswahl fällt
                    // also nie auf "— keins —" zurück, sondern zeigt immer das
                    // tatsächlich wirksame Set.
                    const effectiveRoleId =
                      user.customRoleId ?? customRoles.find((role) => role.isSystem && role.name === user.defaultSystemSetName)?.id ?? "";
                    const selectableRoles = customRoles.filter((role) => role.isSystem || hasCustomRolesFeature);
                    if (canManage && user.employmentType !== "contractor" && effectiveRoleId) {
                      return (
                        <Select defaultValue={effectiveRoleId} onValueChange={(value) => handleCustomRoleChange(user.id, value)}>
                          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {selectableRoles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    }
                    const current = customRoles.find((role) => role.id === effectiveRoleId);
                    return current ? (
                      <LegendKey label={current.name} variant={current.isSystem ? "default" : "started"} />
                    ) : (
                      <span className="text-muted-foreground">{user.employmentType === "contractor" ? "Festes Profil" : "—"}</span>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <LegendKey label={user.isActive ? "aktiv" : "deaktiviert"} variant={user.isActive ? "done" : "default"} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {canManage ? (
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={user.internalCostRate ?? ""}
                        onBlur={(event) => handleCostRateChange(user.id, event.target.value)}
                        className="h-8 w-24"
                        placeholder="—"
                      />
                    ) : (
                      <span className="text-muted-foreground">{user.internalCostRate ?? "—"}</span>
                    )}
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => openCostRateHistory(user)} title="Kostensatz-Historie">
                        Historie
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {canManage ? (
                    <Select defaultValue={user.holidayCalendarId ?? "__none__"} onValueChange={(value) => handleHolidayCalendarChange(user.id, value)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— kein Kalender —</SelectItem>
                        {holidayCalendars.map((calendar) => (
                          <SelectItem key={calendar.id} value={calendar.id}>
                            {calendar.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">{holidayCalendars.find((calendar) => calendar.id === user.holidayCalendarId)?.name ?? "—"}</span>
                  )}
                </TableCell>
                <TableCell>
                  {canManage ? (
                    <Select defaultValue={user.managerId ?? "__none__"} onValueChange={(value) => handleManagerChange(user.id, value)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— kein Manager —</SelectItem>
                        {users
                          .filter((candidate) => candidate.id !== user.id)
                          .map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id}>
                              {candidate.name ?? candidate.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">
                      {users.find((candidate) => candidate.id === user.managerId)?.name ?? users.find((candidate) => candidate.id === user.managerId)?.email ?? "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {canManage && user.id !== currentUserId && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleActiveChange(user.id, !user.isActive)}>
                        {user.isActive ? "Deaktivieren" : "Reaktivieren"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setOffboardTarget(user)}>
                        Offboarden
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {invites.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Offene Einladungen</h2>
          <ul className="mb-8 flex flex-col gap-1">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
                <span>{invite.email}</span>
                <span className="text-xs text-muted-foreground">{invite.role}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {canManage && (
        <>
          <h2 className="mb-4 text-lg font-semibold">Neues Mitglied einladen</h2>
          <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-email">E-Mail</Label>
              <Input id="invite-email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-role">Rolle</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role" className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">member</SelectItem>
                  {inviteEmploymentType !== "contractor" && <SelectItem value="admin">admin</SelectItem>}
                  <SelectItem value="client">client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteRole !== "client" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-employment-type">Typ</Label>
                <Select
                  value={inviteEmploymentType}
                  onValueChange={(value) => {
                    setInviteEmploymentType(value);
                    if (value === "contractor" && inviteRole === "admin") setInviteRole("member");
                  }}
                >
                  <SelectTrigger id="invite-employment-type" className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit">Einladen</Button>
          </form>

          {inviteRole === "client" && (
            <div className="mt-3">
              <Label className="mb-2 block">Sichtbare Projekte</Label>
              <div className="flex flex-col gap-1">
                {projects.length === 0 && <p className="text-sm text-muted-foreground">Keine Projekte vorhanden.</p>}
                {projects.map((project) => (
                  <label key={project.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={grantedProjectIds.includes(project.id)} onCheckedChange={() => toggleProject(project.id)} />
                    {project.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {inviteLink && (
            <Card className="mt-4 p-4 break-all">
              <p className="mb-2 text-sm">Einladungslink:</p>
              <code className="text-sm text-muted-foreground">{inviteLink}</code>
            </Card>
          )}
        </>
      )}

      {hasProjectOverridesFeature && canManage && <ProjectRoleOverridesPanel users={users} projects={projects} customRoles={customRoles} />}

      {offboardTarget && (
        <OffboardDialog
          user={offboardTarget}
          users={users}
          onClose={() => setOffboardTarget(null)}
          onOffboarded={() => {
            setOffboardTarget(null);
            router.refresh();
          }}
        />
      )}

      {costRateHistoryTarget && (
        <CostRateHistoryDialog
          key={costRateHistoryTarget.id}
          userId={costRateHistoryTarget.id}
          userLabel={costRateHistoryTarget.name ?? costRateHistoryTarget.email}
          initialEntries={costRateHistoryEntries}
          open={costRateHistoryTarget !== null}
          onOpenChange={(open) => {
            if (!open) setCostRateHistoryTarget(null);
          }}
        />
      )}
    </div>
  );
}

interface ProjectRoleOverride {
  id: string;
  userId: string;
  customRoleId: string;
  user: { name: string | null; email: string };
  customRole: { name: string };
}

function ProjectRoleOverridesPanel({
  users,
  projects,
  customRoles,
}: {
  users: MemberUser[];
  projects: { id: string; name: string }[];
  customRoles: CustomRoleOption[];
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [customRoleId, setCustomRoleId] = useState(customRoles[0]?.id ?? "");
  const [overrides, setOverrides] = useState<ProjectRoleOverride[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/tenant/projects/${projectId}/role-overrides`)
      .then((response) => (response.ok ? response.json() : { overrides: [] }))
      .then((data) => setOverrides(data.overrides ?? []))
      .catch(() => undefined);
  }, [projectId]);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!projectId || !userId || !customRoleId) return;
    const response = await fetch(`/api/tenant/projects/${projectId}/role-overrides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, customRoleId }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Override konnte nicht gespeichert werden.");
      return;
    }
    const refreshed = await fetch(`/api/tenant/projects/${projectId}/role-overrides`);
    const data = await refreshed.json();
    setOverrides(data.overrides ?? []);
    router.refresh();
  }

  async function handleRemove(overrideId: string) {
    await fetch(`/api/tenant/projects/${projectId}/role-overrides/${overrideId}`, { method: "DELETE" });
    setOverrides((current) => current.filter((override) => override.id !== overrideId));
    router.refresh();
  }

  if (projects.length === 0 || customRoles.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="mb-2 text-lg font-semibold">Projekt-Rollen (Enterprise)</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Weist einem Mitglied eine abweichende Rolle nur für ein einzelnes Projekt zu — hat Vorrang vor dessen tenant-weiter Custom Role.
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="override-project">Projekt</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="override-project" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="override-user">Mitglied</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger id="override-user" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name ?? user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="override-role">Rolle für dieses Projekt</Label>
          <Select value={customRoleId} onValueChange={setCustomRoleId}>
            <SelectTrigger id="override-role" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {customRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">Zuweisen</Button>
      </form>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {overrides.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1">
          {overrides.map((override) => (
            <li key={override.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
              <span>
                {override.user.name ?? override.user.email} → {override.customRole.name}
              </span>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(override.id)}>
                Entfernen
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
