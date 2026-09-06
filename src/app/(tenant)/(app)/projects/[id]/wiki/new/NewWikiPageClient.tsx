"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Textarea } from "@/ui/shadcn/components/textarea";

interface TemplatePage {
  id: string;
  title: string;
  content: string;
  isTemplate: boolean;
}

export function NewWikiPageClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplatePage[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tenant/projects/${projectId}/wiki`)
      .then((response) => (response.ok ? response.json() : { pages: [] }))
      .then((data: { pages: TemplatePage[] }) => {
        if (!cancelled) {
          setTemplates((data.pages ?? []).filter((page) => page.isTemplate));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function handleSelectTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setTitle(template.title);
      setContent(template.content);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/tenant/projects/${projectId}/wiki`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Seite konnte nicht angelegt werden.");
      return;
    }
    router.push(`/projects/${projectId}/wiki/${data.page.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Neue Wiki-Seite</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {templates.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label>Vorlage</Label>
            <Select value={selectedTemplateId || "__none__"} onValueChange={(value) => handleSelectTemplate(value === "__none__" ? "" : value)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Keine Vorlage</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titel" required />
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Inhalt (Markdown)"
          rows={12}
          className="font-mono text-sm"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="self-start">
          Anlegen
        </Button>
      </form>
    </div>
  );
}
