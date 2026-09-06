"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";

interface ListRow {
  id: string;
  name: string;
  position: number;
}

interface FolderRow {
  id: string;
  name: string;
  position: number;
  lists: ListRow[];
}

export function TaskListsEditorClient({
  projectId,
  canManage,
  folders,
}: {
  projectId: string;
  canManage: boolean;
  folders: FolderRow[];
}) {
  const router = useRouter();
  const [newFolderName, setNewFolderName] = useState("");
  const [newListNameByFolder, setNewListNameByFolder] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function handleAddFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newFolderName.trim().length === 0) return;
    const response = await fetch(`/api/tenant/task-folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name: newFolderName }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Ordner konnte nicht angelegt werden.");
      return;
    }
    setNewFolderName("");
    router.refresh();
  }

  async function renameFolder(folderId: string, name: string) {
    setError(null);
    const response = await fetch(`/api/tenant/task-folders/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Umbenennen fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function deleteFolder(folderId: string) {
    setError(null);
    const response = await fetch(`/api/tenant/task-folders/${folderId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Löschen fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function moveFolder(index: number, direction: -1 | 1) {
    const target = folders[index + direction];
    const current = folders[index];
    if (!target) return;
    await Promise.all([
      fetch(`/api/tenant/task-folders/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: target.position }),
      }),
      fetch(`/api/tenant/task-folders/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: current.position }),
      }),
    ]);
    router.refresh();
  }

  async function handleAddList(event: React.FormEvent<HTMLFormElement>, folderId: string) {
    event.preventDefault();
    setError(null);
    const name = (newListNameByFolder[folderId] ?? "").trim();
    if (name.length === 0) return;
    const response = await fetch(`/api/tenant/task-folders/${folderId}/lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Liste konnte nicht angelegt werden.");
      return;
    }
    setNewListNameByFolder((current) => ({ ...current, [folderId]: "" }));
    router.refresh();
  }

  async function renameList(listId: string, name: string) {
    setError(null);
    const response = await fetch(`/api/tenant/task-list-groups/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Umbenennen fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function deleteList(listId: string) {
    setError(null);
    const response = await fetch(`/api/tenant/task-list-groups/${listId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Löschen fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function moveList(folder: FolderRow, index: number, direction: -1 | 1) {
    const target = folder.lists[index + direction];
    const current = folder.lists[index];
    if (!target) return;
    await Promise.all([
      fetch(`/api/tenant/task-list-groups/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: target.position }),
      }),
      fetch(`/api/tenant/task-list-groups/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: current.position }),
      }),
    ]);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Ordner &amp; Listen</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Gruppiere Tasks in benannten Listen (z. B. Sprints), die in Ordnern (z. B. Phasen) organisiert sind.
      </p>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {folders.length === 0 ? (
        <p className="mb-6 text-sm text-muted-foreground">Noch keine Ordner.</p>
      ) : (
        <ul className="mb-8 overflow-hidden rounded-lg border">
          {folders.map((folder, folderIndex) => (
            <li key={folder.id} className="border-b p-4 last:border-0">
              <div className="mb-3 flex items-center gap-2">
                {canManage && (
                  <>
                    <Button variant="ghost" size="icon-sm" disabled={folderIndex === 0} onClick={() => moveFolder(folderIndex, -1)} aria-label="Ordner nach oben">
                      <ChevronUp className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" disabled={folderIndex === folders.length - 1} onClick={() => moveFolder(folderIndex, 1)} aria-label="Ordner nach unten">
                      <ChevronDown className="size-3.5" />
                    </Button>
                  </>
                )}
                {canManage ? (
                  <Input
                    defaultValue={folder.name}
                    onBlur={(event) => event.target.value !== folder.name && renameFolder(folder.id, event.target.value)}
                    className="h-8 w-56 font-semibold"
                  />
                ) : (
                  <strong className="text-sm">{folder.name}</strong>
                )}
                {canManage && (
                  <Button variant="destructiveSubtle" size="sm" onClick={() => deleteFolder(folder.id)} className="ml-auto">
                    Ordner löschen
                  </Button>
                )}
              </div>

              {folder.lists.length === 0 ? (
                <p className="ml-6 text-sm text-muted-foreground">Noch keine Listen.</p>
              ) : (
                <ul className="mb-3 ml-6 flex flex-col gap-1.5">
                  {folder.lists.map((list, listIndex) => (
                    <li key={list.id} className="flex items-center gap-2">
                      <div className="flex flex-1 items-center gap-2">
                        {canManage && (
                          <>
                            <Button variant="ghost" size="icon-sm" disabled={listIndex === 0} onClick={() => moveList(folder, listIndex, -1)} aria-label="Liste nach oben">
                              <ChevronUp className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" disabled={listIndex === folder.lists.length - 1} onClick={() => moveList(folder, listIndex, 1)} aria-label="Liste nach unten">
                              <ChevronDown className="size-3.5" />
                            </Button>
                          </>
                        )}
                        {canManage ? (
                          <Input
                            defaultValue={list.name}
                            onBlur={(event) => event.target.value !== list.name && renameList(list.id, event.target.value)}
                            className="h-8 w-44"
                          />
                        ) : (
                          <span className="text-sm">{list.name}</span>
                        )}
                      </div>
                      {canManage && (
                        <Button variant="destructiveSubtle" size="sm" onClick={() => deleteList(list.id)}>
                          Löschen
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canManage && (
                <form onSubmit={(event) => handleAddList(event, folder.id)} className="ml-6 flex gap-2">
                  <Input
                    value={newListNameByFolder[folder.id] ?? ""}
                    onChange={(event) => setNewListNameByFolder((current) => ({ ...current, [folder.id]: event.target.value }))}
                    placeholder="Neue Liste"
                    className="h-8 w-44"
                  />
                  <Button type="submit" variant="outline" size="sm">
                    Liste hinzufügen
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Neuer Ordner</h2>
          <form onSubmit={handleAddFolder} className="flex gap-2">
            <Input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Name" required className="flex-1" />
            <Button type="submit">Hinzufügen</Button>
          </form>
        </>
      )}
    </div>
  );
}
