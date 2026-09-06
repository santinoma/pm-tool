"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

interface ProjectOption {
  id: string;
  name: string;
}

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  projectId: string | null;
  projectName: string | null;
}

export function MeetingsClient({ projects, meetings }: { projects: ProjectOption[]; meetings: Meeting[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, scheduledAt, projectId: projectId === "none" ? null : projectId }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Meeting konnte nicht angelegt werden.");
      return;
    }
    setTitle("");
    setScheduledAt("");
    setProjectId("none");
    router.refresh();
  }

  return (
    <div className="py-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Meetings</h1>
      <p className="mb-6 text-sm text-muted-foreground">Alle Meetings projektübergreifend.</p>

      <h2 className="mb-3 text-lg font-semibold">Neues Meeting</h2>
      <form onSubmit={handleSubmit} className="mb-8 flex flex-wrap gap-3">
        <Input placeholder="Titel" value={title} onChange={(event) => setTitle(event.target.value)} required className="min-w-44 flex-1" />
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
          required
          className="w-auto"
        />
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Projekt (optional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Kein Projekt</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" loading={saving}>
          Anlegen
        </Button>
      </form>

      {error && <p className="mb-6 text-sm text-destructive">{error}</p>}

      {meetings.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Meetings</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Projekt</TableHead>
                <TableHead>Termin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map((meeting) => (
                <TableRow key={meeting.id}>
                  <TableCell className="font-semibold">
                    <Link href={`/meetings/${meeting.id}`} className="hover:text-primary hover:underline">
                      {meeting.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{meeting.projectName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(meeting.scheduledAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
