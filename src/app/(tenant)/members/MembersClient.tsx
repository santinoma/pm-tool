"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LegendKey } from "@/ui/components/LegendKey";

interface MemberUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  internalCostRate: number | null;
  customRoleId: string | null;
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
}

export function MembersClient({
  currentUserId,
  canManage,
  users,
  invites,
  projects,
  customRoles,
  hasCustomRolesFeature,
  hasProjectOverridesFeature,
}: {
  currentUserId: string;
  canManage: boolean;
  users: MemberUser[];
  invites: PendingInvite[];
  projects: { id: string; name: string }[];
  customRoles: CustomRoleOption[];
  hasCustomRolesFeature: boolean;
  hasProjectOverridesFeature: boolean;
}) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [grantedProjectIds, setGrantedProjectIds] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCustomRoleChange(userId: string, customRoleId: string) {
    setError(null);
    const response = await fetch(`/api/tenant/users/${userId}/custom-role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customRoleId: customRoleId || null }),
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

  return (
    <div className="container">
      <h1 style={{ marginBottom: "var(--space-6)" }}>Mitglieder</h1>

      <div className="table-wrap" style={{ marginBottom: "var(--space-8)" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>E-Mail</th>
              <th>Rolle</th>
              {hasCustomRolesFeature && <th>Custom Role</th>}
              <th>Status</th>
              <th>Interner Stundensatz</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name ?? "—"}</td>
                <td className="text-muted">{user.email}</td>
                <td>
                  {canManage && user.id !== currentUserId ? (
                    <select
                      className="select"
                      defaultValue={user.role}
                      onChange={(event) => handleRoleChange(user.id, event.target.value)}
                    >
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                      <option value="member">member</option>
                    </select>
                  ) : (
                    <span className="coord">{user.role}</span>
                  )}
                </td>
                {hasCustomRolesFeature && (
                  <td>
                    {canManage ? (
                      <select
                        className="select"
                        defaultValue={user.customRoleId ?? ""}
                        onChange={(event) => handleCustomRoleChange(user.id, event.target.value)}
                      >
                        <option value="">— Basis-Rolle —</option>
                        {customRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="coord">
                        {customRoles.find((role) => role.id === user.customRoleId)?.name ?? "—"}
                      </span>
                    )}
                  </td>
                )}
                <td>
                  <LegendKey label={user.isActive ? "aktiv" : "deaktiviert"} variant={user.isActive ? "done" : "default"} />
                </td>
                <td>
                  {canManage ? (
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={user.internalCostRate ?? ""}
                      onBlur={(event) => handleCostRateChange(user.id, event.target.value)}
                      className="input"
                      style={{ width: "90px", height: "30px" }}
                      placeholder="—"
                    />
                  ) : (
                    <span className="coord">{user.internalCostRate ?? "—"}</span>
                  )}
                </td>
                <td>
                  {canManage && user.id !== currentUserId && (
                    <button type="button" onClick={() => handleActiveChange(user.id, !user.isActive)} className="btn btn-ghost btn-sm">
                      {user.isActive ? "Deaktivieren" : "Reaktivieren"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invites.length > 0 && (
        <>
          <h2 style={{ marginBottom: "var(--space-3)" }}>Offene Einladungen</h2>
          <ul className="list-plain" style={{ marginBottom: "var(--space-8)" }}>
            {invites.map((invite) => (
              <li key={invite.id}>
                <span>{invite.email}</span>
                <span className="coord">{invite.role}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {canManage && (
        <>
          <h2 style={{ marginBottom: "var(--space-4)" }}>Neues Mitglied einladen</h2>
          <form onSubmit={handleInvite} className="row" style={{ gap: "var(--space-3)", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="field">
              <label className="field-label" htmlFor="invite-email">
                E-Mail
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
                className="input"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="invite-role">
                Rolle
              </label>
              <select
                id="invite-role"
                className="select"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
                <option value="client">client</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              Einladen
            </button>
          </form>

          {inviteRole === "client" && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <span className="field-label" style={{ display: "block", marginBottom: "var(--space-2)" }}>
                Sichtbare Projekte
              </span>
              <div className="stack" style={{ gap: "var(--space-1)" }}>
                {projects.length === 0 && <p className="text-muted">Keine Projekte vorhanden.</p>}
                {projects.map((project) => (
                  <label key={project.id} className="row" style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                    <input
                      type="checkbox"
                      checked={grantedProjectIds.includes(project.id)}
                      onChange={() => toggleProject(project.id)}
                    />
                    {project.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="field-error" style={{ marginTop: "var(--space-3)" }}>{error}</p>}
          {inviteLink && (
            <div className="card" style={{ marginTop: "var(--space-4)", wordBreak: "break-all" }}>
              <p style={{ marginBottom: "var(--space-2)" }}>Einladungslink:</p>
              <code className="coord" style={{ fontSize: "var(--text-sm)" }}>{inviteLink}</code>
            </div>
          )}
        </>
      )}

      {hasProjectOverridesFeature && canManage && (
        <ProjectRoleOverridesPanel users={users} projects={projects} customRoles={customRoles} />
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
    <div style={{ marginTop: "var(--space-8)" }}>
      <h2 style={{ marginBottom: "var(--space-2)" }}>Projekt-Rollen (Enterprise)</h2>
      <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>
        Weist einem Mitglied eine abweichende Rolle nur für ein einzelnes Projekt zu — hat
        Vorrang vor dessen tenant-weiter Custom Role.
      </p>

      <form onSubmit={handleAdd} className="row" style={{ gap: "var(--space-3)", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="field">
          <label className="field-label" htmlFor="override-project">
            Projekt
          </label>
          <select id="override-project" className="select" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="override-user">
            Mitglied
          </label>
          <select id="override-user" className="select" value={userId} onChange={(event) => setUserId(event.target.value)}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ?? user.email}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="override-role">
            Rolle für dieses Projekt
          </label>
          <select id="override-role" className="select" value={customRoleId} onChange={(event) => setCustomRoleId(event.target.value)}>
            {customRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Zuweisen
        </button>
      </form>
      {error && <p className="field-error" style={{ marginTop: "var(--space-3)" }}>{error}</p>}

      {overrides.length > 0 && (
        <ul className="list-plain" style={{ marginTop: "var(--space-4)" }}>
          {overrides.map((override) => (
            <li key={override.id} className="row" style={{ justifyContent: "space-between" }}>
              <span>
                {override.user.name ?? override.user.email} → {override.customRole.name}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleRemove(override.id)}>
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
