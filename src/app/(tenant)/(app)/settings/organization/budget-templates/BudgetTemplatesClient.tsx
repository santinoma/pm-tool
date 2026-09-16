"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

interface TemplateRow {
  id: string;
  title: string;
  color: string | null;
  projectId: string;
  projectName: string;
  ownerLabel: string;
  sectionCount: number;
}

export function BudgetTemplatesClient({
  canManage,
  templates,
  projects,
  users,
}: {
  canManage: boolean;
  templates: TemplateRow[];
  projects: { id: string; name: string }[];
  users: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);
  const [targetProjectId, setTargetProjectId] = useState("");
  const [targetOwnerId, setTargetOwnerId] = useState(users[0]?.id ?? "");
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function onSaved() {
    router.refresh();
  }

  async function handleDelete(templateId: string) {
    if (!window.confirm("Diese Vorlage wirklich löschen?")) return;
    await fetch(`/api/tenant/budgets/${templateId}`, { method: "DELETE" });
    onSaved();
  }

  async function handleRenameSave(templateId: string) {
    await fetch(`/api/tenant/budgets/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameValue }),
    });
    setRenamingId(null);
    onSaved();
  }

  async function handleUseTemplate(template: TemplateRow) {
    if (!targetProjectId || !newTitle.trim()) return;
    setBusy(true);
    const response = await fetch("/api/tenant/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: targetProjectId,
        title: newTitle,
        ownerId: targetOwnerId,
        templateBudgetId: template.id,
      }),
    });
    const data = await response.json();
    setBusy(false);
    if (response.ok) {
      router.push(`/financials/${targetProjectId}/${data.budget.id}`);
    }
  }

  if (templates.length === 0) {
    return (
      <div className="mx-auto max-w-3xl pb-10">
        <h1 className="text-2xl font-bold tracking-tight">Budget Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organisationsweiter Katalog wiederverwendbarer Budget-Vorlagen — nutzbar in jedem Projekt, unabhängig davon,
          in welchem Projekt die Vorlage ursprünglich angelegt wurde.
        </p>
        <div className="mt-6 rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Vorlagen</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Markiere ein Budget in den Budget-Einstellungen als Vorlage (&bdquo;Als Vorlage speichern&ldquo;), um es
            hier zu sehen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <h1 className="text-2xl font-bold tracking-tight">Budget Templates</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Organisationsweiter Katalog wiederverwendbarer Budget-Vorlagen — nutzbar in jedem Projekt, unabhängig davon,
        in welchem Projekt die Vorlage ursprünglich angelegt wurde.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Ursprungsprojekt</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Services</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>
                  {renamingId === template.id ? (
                    <div className="flex gap-2">
                      <Input className="h-8 w-48" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
                      <Button size="sm" onClick={() => handleRenameSave(template.id)}>
                        Speichern
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}>
                        Abbrechen
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 rounded-full" style={{ background: template.color ?? "var(--border)" }} />
                      {template.title}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{template.projectName}</TableCell>
                <TableCell className="text-muted-foreground">{template.ownerLabel}</TableCell>
                <TableCell className="text-right">{template.sectionCount}</TableCell>
                <TableCell className="text-right">
                  {canManage && renamingId !== template.id && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRenamingId(template.id);
                          setRenameValue(template.title);
                        }}
                      >
                        Umbenennen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUsingTemplateId(usingTemplateId === template.id ? null : template.id);
                          setNewTitle(`${template.title} Kopie`);
                          setTargetProjectId("");
                        }}
                      >
                        Verwenden
                      </Button>
                      <Button variant="destructiveSubtle" size="sm" onClick={() => handleDelete(template.id)}>
                        Löschen
                      </Button>
                    </div>
                  )}
                  {usingTemplateId === template.id && (
                    <div className="mt-3 flex flex-col gap-2 rounded-lg border p-3 text-left">
                      <Label>Neuer Budget-Titel</Label>
                      <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                      <Label>Zielprojekt</Label>
                      <Select value={targetProjectId} onValueChange={setTargetProjectId}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Projekt wählen…" /></SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Label>Owner</Label>
                      <Select value={targetOwnerId} onValueChange={setTargetOwnerId}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => handleUseTemplate(template)} loading={busy} disabled={!targetProjectId}>
                        Budget erstellen
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
