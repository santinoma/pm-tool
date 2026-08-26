"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PERMISSION_GROUPS, PERMISSION_LABELS } from "@/tenant/permissions/permissionCatalog";

interface CustomRoleRow {
  id: string;
  name: string;
  permissions: string[];
}

export function RolesClient({ canManage, roles }: { canManage: boolean; roles: CustomRoleRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function togglePermission(key: string) {
    setPermissions((current) => (current.includes(key) ? current.filter((p) => p !== key) : [...current, key]));
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, permissions }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Rolle konnte nicht angelegt werden.");
      return;
    }
    setName("");
    setPermissions([]);
    router.refresh();
  }

  async function togglePermissionOnExistingRole(role: CustomRoleRow, key: string) {
    const nextPermissions = role.permissions.includes(key)
      ? role.permissions.filter((p) => p !== key)
      : [...role.permissions, key];
    await fetch(`/api/tenant/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: nextPermissions }),
    });
    router.refresh();
  }

  async function handleDelete(roleId: string) {
    const confirmed = window.confirm(
      "Rolle wirklich löschen? Nutzer mit dieser Rolle fallen auf ihre Basis-Rolle zurück.",
    );
    if (!confirmed) return;
    await fetch(`/api/tenant/roles/${roleId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: "720px" }}>
      <h1 style={{ marginBottom: "var(--space-2)" }}>Rollen & Rechte</h1>
      <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
        Eigene Rollen mit granularen Berechtigungen — zusätzlich zu den Basis-Rollen
        (Owner/Admin/Member/Client). Nutzer ohne zugewiesene Custom Role behalten das
        Verhalten ihrer Basis-Rolle unverändert.
      </p>

      {roles.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>
          Noch keine eigenen Rollen.
        </p>
      ) : (
        <div className="stack" style={{ gap: "var(--space-5)", marginBottom: "var(--space-8)" }}>
          {roles.map((role) => (
            <div key={role.id} className="card">
              <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                <strong>{role.name}</strong>
                {canManage && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(role.id)}
                  >
                    Löschen
                  </button>
                )}
              </div>
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.label} style={{ marginBottom: "var(--space-3)" }}>
                  <div className="text-faint coord" style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-1)" }}>
                    {group.label}
                  </div>
                  {group.keys.map((key) => (
                    <label
                      key={key}
                      className="row"
                      style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}
                    >
                      <input
                        type="checkbox"
                        checked={role.permissions.includes(key)}
                        disabled={!canManage}
                        onChange={() => togglePermissionOnExistingRole(role, key)}
                      />
                      {PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS] ?? key}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <>
          <h2 style={{ marginBottom: "var(--space-4)" }}>Neue Rolle</h2>
          <form onSubmit={handleCreate}>
            <div className="field" style={{ marginBottom: "var(--space-4)" }}>
              <label className="field-label" htmlFor="role-name">
                Name
              </label>
              <input
                id="role-name"
                type="text"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label} style={{ marginBottom: "var(--space-3)" }}>
                <div className="text-faint coord" style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-1)" }}>
                  {group.label}
                </div>
                {group.keys.map((key) => (
                  <label
                    key={key}
                    className="row"
                    style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(key)}
                      onChange={() => togglePermission(key)}
                    />
                    {PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS] ?? key}
                  </label>
                ))}
              </div>
            ))}

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: "var(--space-3)" }}>
              Rolle anlegen
            </button>
          </form>
          {error && <p className="field-error" style={{ marginTop: "var(--space-3)" }}>{error}</p>}
        </>
      )}
    </div>
  );
}
