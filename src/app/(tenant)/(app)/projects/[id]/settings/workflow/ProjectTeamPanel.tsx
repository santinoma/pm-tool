"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

interface MemberRow {
  id: string;
  userId: string;
  label: string;
}

export function ProjectTeamPanel({
  projectId,
  canManage,
  isTemplate,
  members,
  allUsers,
}: {
  projectId: string;
  canManage: boolean;
  isTemplate: boolean;
  members: MemberRow[];
  allUsers: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [addUserId, setAddUserId] = useState(allUsers.find((u) => !members.some((m) => m.userId === u.id))?.id ?? "");
  const [saving, setSaving] = useState(false);

  const availableUsers = allUsers.filter((user) => !members.some((member) => member.userId === user.id));

  async function handleToggleTemplate(next: boolean) {
    setSaving(true);
    await fetch(`/api/tenant/projects/${projectId}/mark-template`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTemplate: next }),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleAddMember() {
    if (!addUserId) return;
    setSaving(true);
    await fetch(`/api/tenant/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: addUserId }),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleRemoveMember(memberId: string) {
    setSaving(true);
    await fetch(`/api/tenant/projects/${projectId}/members/${memberId}`, { method: "DELETE" });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="mx-auto mb-8 max-w-xl pb-10">
      <h2 className="mb-3 text-lg font-semibold">Team & Vorlage</h2>

      {canManage && (
        <label className="mb-5 flex items-center gap-2 text-sm">
          <Checkbox checked={isTemplate} disabled={saving} onCheckedChange={(checked) => handleToggleTemplate(checked === true)} />
          Als Vorlage markieren (bei &quot;Create from template&quot; wählbar)
        </label>
      )}

      <div className="mb-2 text-xs font-semibold text-muted-foreground">Mitglieder ({members.length})</div>
      <ul className={`flex flex-col gap-1 ${canManage ? "mb-4" : ""}`}>
        {members.map((member) => (
          <li key={member.id} className="flex items-center justify-between gap-3 border-b py-1.5 text-sm last:border-0">
            <span>{member.label}</span>
            {canManage && (
              <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.id)} disabled={saving}>
                Entfernen
              </Button>
            )}
          </li>
        ))}
      </ul>

      {canManage && availableUsers.length > 0 && (
        <div className="flex gap-2">
          <Select value={addUserId} onValueChange={setAddUserId}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleAddMember} disabled={saving}>
            Hinzufügen
          </Button>
        </div>
      )}
    </div>
  );
}
