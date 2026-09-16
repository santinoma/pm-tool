"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Badge } from "@/ui/shadcn/components/badge";

interface TeamRow {
  id: string;
  name: string;
  members: { id: string; label: string }[];
}

export function TeamsSettingsClient({
  canManage,
  teams,
  users,
}: {
  canManage: boolean;
  teams: TeamRow[];
  users: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [addingMemberTeamId, setAddingMemberTeamId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  function onSaved() {
    router.refresh();
  }

  async function handleCreate() {
    if (!newTeamName.trim()) return;
    setCreating(true);
    await fetch("/api/tenant/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTeamName }),
    });
    setCreating(false);
    setNewTeamName("");
    onSaved();
  }

  async function handleDeleteTeam(teamId: string) {
    if (!window.confirm("Dieses Team wirklich löschen? Die Mitglieder selbst bleiben erhalten.")) return;
    await fetch(`/api/tenant/teams/${teamId}`, { method: "DELETE" });
    onSaved();
  }

  async function handleAddMember(teamId: string) {
    if (!selectedUserId) return;
    await fetch(`/api/tenant/teams/${teamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId }),
    });
    setAddingMemberTeamId(null);
    setSelectedUserId("");
    onSaved();
  }

  async function handleRemoveMember(teamId: string, userId: string) {
    await fetch(`/api/tenant/teams/${teamId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    onSaved();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Benannte Gruppen von Mitgliedern — eine Person kann in mehreren Teams sein. Teams dienen als Filter/Feld in
          Resourcing und Reports.
        </p>
      </div>

      {canManage && (
        <div className="flex gap-2">
          <Input placeholder="Neues Team, z. B. Design" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
          <Button onClick={handleCreate} loading={creating}>
            Team anlegen
          </Button>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Teams</h3>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardContent className="flex flex-col gap-3 pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{team.name}</h3>
                  {canManage && (
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteTeam(team.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {team.members.map((member) => (
                    <Badge key={member.id} variant="outline" className="flex items-center gap-1">
                      {member.label}
                      {canManage && (
                        <button
                          type="button"
                          className="ml-1 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(team.id, member.id)}
                          aria-label={`${member.label} entfernen`}
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  ))}
                  {team.members.length === 0 && <span className="text-xs text-muted-foreground">Keine Mitglieder</span>}
                </div>
                {canManage && (
                  <div>
                    {addingMemberTeamId === team.id ? (
                      <div className="flex gap-2">
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger className="w-56"><SelectValue placeholder="Person wählen…" /></SelectTrigger>
                          <SelectContent>
                            {users
                              .filter((user) => !team.members.some((member) => member.id === user.id))
                              .map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => handleAddMember(team.id)}>
                          Hinzufügen
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddingMemberTeamId(null)}>
                          Abbrechen
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setAddingMemberTeamId(team.id)}>
                        + Mitglied hinzufügen
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
