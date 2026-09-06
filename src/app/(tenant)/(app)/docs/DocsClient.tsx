"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

interface ProjectOption {
  id: string;
  name: string;
}

interface DocRow {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  creatorName: string | null;
}

export function DocsClient({ projects, pages }: { projects: ProjectOption[]; pages: DocRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [newDocProjectId, setNewDocProjectId] = useState<string>(projects[0]?.id ?? "");

  function toggleGroup(key: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const visiblePages = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term ? pages.filter((page) => page.title.toLowerCase().includes(term)) : pages;
    return [...filtered].sort((a, b) =>
      sortDesc ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt),
    );
  }, [pages, search, sortDesc]);

  const groups = useMemo(() => {
    const byProject = new Map<string, { projectName: string; pages: DocRow[] }>();
    for (const page of visiblePages) {
      const entry = byProject.get(page.projectId);
      if (entry) {
        entry.pages.push(page);
      } else {
        byProject.set(page.projectId, { projectName: page.projectName, pages: [page] });
      }
    }
    return Array.from(byProject.entries())
      .map(([projectId, { projectName, pages: groupPages }]) => ({ key: projectId, label: projectName, pages: groupPages }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [visiblePages]);

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">Docs</h1>
          <p className="text-sm text-muted-foreground">Alle Dokumente projektübergreifend.</p>
        </div>
        {projects.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Doc
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="mb-2 text-sm font-medium">Projekt wählen</div>
              <Select value={newDocProjectId} onValueChange={setNewDocProjectId}>
                <SelectTrigger className="mb-3 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={() => router.push(`/projects/${newDocProjectId}/wiki/new`)}>
                Weiter
              </Button>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <Input
        placeholder="Docs durchsuchen…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="mb-4 max-w-xs"
      />

      {groups.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Dokumente</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Erstellt am</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => setSortDesc((current) => !current)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Zuletzt bearbeitet
                    <ChevronDown className={cn("size-3.5 transition-transform", !sortDesc && "rotate-180")} />
                  </button>
                </TableHead>
                <TableHead>Ersteller</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const isCollapsed = collapsedGroups.has(group.key);
                return (
                  <Fragment key={group.key}>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={4} className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          className="flex w-full items-center gap-3 px-2 py-2 text-left"
                        >
                          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                          <span className="font-medium">{group.label}</span>
                          <span className="text-xs text-muted-foreground">{group.pages.length}</span>
                        </button>
                      </TableCell>
                    </TableRow>
                    {!isCollapsed &&
                      group.pages.map((page) => (
                        <TableRow key={page.id}>
                          <TableCell>
                            <Link href={`/projects/${page.projectId}/wiki/${page.id}`} className="font-semibold hover:text-primary hover:underline">
                              {page.title}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{new Date(page.createdAt).toLocaleDateString("de-DE")}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(page.updatedAt).toLocaleDateString("de-DE")}</TableCell>
                          <TableCell className="text-muted-foreground">{page.creatorName ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
