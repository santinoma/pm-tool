"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  resolveWithDependencies,
  blockingDependents,
  type PermissionKey,
} from "@/tenant/permissions/permissionCatalog";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";

interface CustomRoleRow {
  id: string;
  name: string;
  permissions: string[];
}

function isPermissionKey(key: string): key is PermissionKey {
  return key in PERMISSION_LABELS;
}

/**
 * Berechnet die nächste Permission-Menge nach einem Toggle-Klick.
 * Checken: löst automatisch alle Voraussetzungen mit auf (Auto-Enable).
 * Unchecken: kaskadiert auf alle davon abhängigen, aktuell gesetzten
 * Permissions (Cascade-and-inform statt Hard-Block) und meldet, welche
 * zusätzlich deaktiviert wurden.
 */
function toggle(current: string[], key: string): { next: string[]; cascadedOff: PermissionKey[] } {
  if (!isPermissionKey(key)) {
    return { next: current.includes(key) ? current.filter((p) => p !== key) : [...current, key], cascadedOff: [] };
  }
  if (current.includes(key)) {
    const currentKeys = current.filter(isPermissionKey);
    const dependents = blockingDependents(key, currentKeys);
    const toRemove = new Set([key, ...dependents]);
    return { next: current.filter((p) => !toRemove.has(p as PermissionKey)), cascadedOff: dependents };
  }
  const resolved = resolveWithDependencies([...current.filter(isPermissionKey), key]);
  return { next: resolved, cascadedOff: [] };
}

export function RolesClient({ canManage, roles }: { canManage: boolean; roles: CustomRoleRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cascadeNote, setCascadeNote] = useState<string | null>(null);

  function describeCascade(removedKey: string, dependents: PermissionKey[]): string {
    const removedLabel = PERMISSION_LABELS[removedKey as PermissionKey] ?? removedKey;
    const dependentLabels = dependents.map((key) => PERMISSION_LABELS[key] ?? key).join(", ");
    return `"${dependentLabels}" hängt von "${removedLabel}" ab und wurde mit deaktiviert.`;
  }

  function togglePermission(key: string) {
    setPermissions((current) => {
      const { next, cascadedOff } = toggle(current, key);
      setCascadeNote(cascadedOff.length > 0 ? describeCascade(key, cascadedOff) : null);
      return next;
    });
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
    const { next, cascadedOff } = toggle(role.permissions, key);
    setCascadeNote(cascadedOff.length > 0 ? describeCascade(key, cascadedOff) : null);
    await fetch(`/api/tenant/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: next }),
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
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Rollen & Rechte</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Eigene Rollen mit granularen Berechtigungen — zusätzlich zu den Basis-Rollen (Owner/Admin/Member/Client).
        Nutzer ohne zugewiesene Custom Role behalten das Verhalten ihrer Basis-Rolle unverändert.
      </p>

      {cascadeNote && <p className="mb-4 text-sm text-muted-foreground">{cascadeNote}</p>}

      {roles.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Noch keine eigenen Rollen.</p>
      ) : (
        <div className="mb-8 flex flex-col gap-5">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardContent>
                <div className="mb-3 flex items-center justify-between">
                  <strong className="text-sm">{role.name}</strong>
                  {canManage && (
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(role.id)}>
                      Löschen
                    </Button>
                  )}
                </div>
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label} className="mb-3">
                    <div className="mb-1 font-mono text-xs text-muted-foreground/70">{group.label}</div>
                    {group.keys.map((key) => (
                      <Label key={key} className="mb-1 flex items-center gap-2 font-normal">
                        <Checkbox
                          checked={role.permissions.includes(key)}
                          disabled={!canManage}
                          onCheckedChange={() => togglePermissionOnExistingRole(role, key)}
                        />
                        {PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS] ?? key}
                      </Label>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canManage && (
        <>
          <h2 className="mb-4 text-lg font-semibold">Neue Rolle</h2>
          <form onSubmit={handleCreate}>
            <div className="mb-4">
              <Label htmlFor="role-name" className="mb-2 block">
                Name
              </Label>
              <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} required className="max-w-sm" />
            </div>

            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label} className="mb-3">
                <div className="mb-1 font-mono text-xs text-muted-foreground/70">{group.label}</div>
                {group.keys.map((key) => (
                  <Label key={key} className="mb-1 flex items-center gap-2 font-normal">
                    <Checkbox checked={permissions.includes(key)} onCheckedChange={() => togglePermission(key)} />
                    {PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS] ?? key}
                  </Label>
                ))}
              </div>
            ))}

            <Button type="submit" disabled={saving} className="mt-3">
              Rolle anlegen
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
