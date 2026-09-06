"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

import { Button } from "@/ui/shadcn/components/button";
import { Checkbox } from "@/ui/shadcn/components/checkbox";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Textarea } from "@/ui/shadcn/components/textarea";
import { cn } from "@/ui/shadcn/lib/utils";

interface WikiPage {
  id: string;
  title: string;
  content: string;
  isTemplate: boolean;
}

interface CustomFieldDef {
  id: string;
  key: string;
  label: string;
  type: string;
  options: string[];
}

interface CustomFieldValue {
  fieldId: string;
  value: string;
}

interface SharedLink {
  id: string;
  token: string;
  revokedAt: string | null;
}

interface SiblingPage {
  id: string;
  title: string;
}

export function WikiPageClient({
  projectId,
  page,
  contentHtml,
  canManage,
  customFieldDefs,
  customFieldValues,
  sharedLinks,
  siblingPages,
}: {
  projectId: string;
  page: WikiPage;
  contentHtml: string;
  canManage: boolean;
  customFieldDefs: CustomFieldDef[];
  customFieldValues: CustomFieldValue[];
  sharedLinks: SharedLink[];
  siblingPages: SiblingPage[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [isTemplate, setIsTemplate] = useState(page.isTemplate);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const response = await fetch(`/api/tenant/wiki/${page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, isTemplate }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleToggleTemplate(next: boolean) {
    setIsTemplate(next);
    await fetch(`/api/tenant/wiki/${page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTemplate: next }),
    });
    router.refresh();
  }

  async function handleDelete() {
    await fetch(`/api/tenant/wiki/${page.id}`, { method: "DELETE" });
    router.push(`/projects/${projectId}/wiki`);
    router.refresh();
  }

  return (
    <div className="flex items-start gap-6 pb-10">
      <aside className="w-52 shrink-0 rounded-lg border p-2">
        <div className="px-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Seiten</div>
        <ul className="flex flex-col gap-0.5">
          {siblingPages.map((sibling) => (
            <li key={sibling.id}>
              <Link
                href={`/projects/${projectId}/wiki/${sibling.id}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                  sibling.id === page.id && "bg-primary/10 font-semibold text-primary hover:bg-primary/10",
                )}
              >
                <FileText className="size-3.5 shrink-0" />
                <span className="truncate">{sibling.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/projects/${projectId}/wiki`} className="text-muted-foreground hover:text-foreground">
              Wiki
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="flex items-center gap-1.5 font-medium">
              <FileText className="size-3.5" />
              {page.title}
            </span>
          </div>
          {!editing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Bearbeiten
              </Button>
              <Button variant="destructiveSubtle" size="sm" onClick={handleDelete}>
                Löschen
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-4">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="border-0 px-0 text-2xl font-bold shadow-none focus-visible:ring-0"
            />
            <Textarea value={content} onChange={(event) => setContent(event.target.value)} rows={16} className="font-mono text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isTemplate} onCheckedChange={(checked) => setIsTemplate(checked === true)} />
              Als Vorlage verwenden
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSave}>Speichern</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mb-4 text-2xl font-bold tracking-tight">{page.title}</h1>
            <div className="text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: contentHtml }} />

            {canManage && (
              <label className="mt-6 flex items-center gap-2 text-sm">
                <Checkbox checked={isTemplate} onCheckedChange={(checked) => handleToggleTemplate(checked === true)} />
                Als Vorlage verwenden
              </label>
            )}

            <CustomFieldsSection
              wikiPageId={page.id}
              customFieldDefs={customFieldDefs}
              customFieldValues={customFieldValues}
              canManage={canManage}
            />

            {canManage && <SharedWikiLinkPanel wikiPageId={page.id} sharedLinks={sharedLinks} />}
          </>
        )}
      </div>
    </div>
  );
}

function CustomFieldsSection({
  wikiPageId,
  customFieldDefs,
  customFieldValues,
  canManage,
}: {
  wikiPageId: string;
  customFieldDefs: CustomFieldDef[];
  customFieldValues: CustomFieldValue[];
  canManage: boolean;
}) {
  const router = useRouter();
  if (customFieldDefs.length === 0) return null;
  const valueByFieldId = new Map(customFieldValues.map((v) => [v.fieldId, v.value]));

  async function saveValue(fieldId: string, value: string) {
    await fetch(`/api/tenant/wiki-pages/${wikiPageId}/custom-fields/${fieldId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-lg border p-4">
      <h3 className="mb-3 text-base font-semibold">Custom Fields</h3>
      <div className="flex flex-col gap-3">
        {customFieldDefs.map((field) => {
          const current = valueByFieldId.get(field.id) ?? "";
          if (!canManage) {
            return (
              <div key={field.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{field.label}</span>
                <span>{current || "—"}</span>
              </div>
            );
          }
          if (field.type === "select") {
            return (
              <div key={field.id} className="flex flex-col gap-2">
                <Label>{field.label}</Label>
                <Select defaultValue={current || undefined} onValueChange={(value) => saveValue(field.id, value)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }
          return (
            <div key={field.id} className="flex flex-col gap-2">
              <Label>{field.label}</Label>
              <Input
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                defaultValue={current}
                onBlur={(e) => saveValue(field.id, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SharedWikiLinkPanel({ wikiPageId, sharedLinks }: { wikiPageId: string; sharedLinks: SharedLink[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setSaving(true);
    const response = await fetch(`/api/tenant/wiki-pages/${wikiPageId}/shared-links`, { method: "POST" });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Link konnte nicht erstellt werden.");
      return;
    }
    router.refresh();
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/tenant/shared-wiki-links/${id}`, { method: "PATCH" });
    router.refresh();
  }

  const shareOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const activeLink = sharedLinks.find((link) => link.revokedAt === null);

  return (
    <div className="mt-6">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)} className="mb-3">
        Teilen
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </Button>

      {open && (
        <div className="rounded-lg border p-4">
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          {!activeLink ? (
            <Button size="sm" onClick={handleCreate} loading={saving}>
              Freigabe-Link erstellen
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-xs text-muted-foreground">
                {shareOrigin}/shared-doc/{activeLink.token}
              </span>
              <Button variant="destructiveSubtle" size="sm" onClick={() => handleRevoke(activeLink.id)}>
                Widerrufen
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
