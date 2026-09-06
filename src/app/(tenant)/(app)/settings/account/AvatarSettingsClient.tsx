"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/ui/components/Avatar";
import { Button } from "@/ui/shadcn/components/button";
import { Label } from "@/ui/shadcn/components/label";

const PRESETS = ["avatar-1", "avatar-2", "avatar-3", "avatar-4", "avatar-5"];

export function AvatarSettingsClient({
  name,
  email,
  avatarUrl,
}: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setSaving(true);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/tenant/avatar", { method: "POST", body: formData });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Profilbild konnte nicht hochgeladen werden.");
      return;
    }
    router.refresh();
  }

  async function handlePresetSelect(preset: string) {
    setError(null);
    setSaving(true);
    const response = await fetch("/api/tenant/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Profilbild konnte nicht gesetzt werden.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Label className="mb-3 block">Profilbild</Label>
      <div className="mb-4 flex items-center gap-4">
        <Avatar name={name} email={email} avatarUrl={avatarUrl} size={64} />
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => fileInputRef.current?.click()}>
            Eigenes Bild hochladen
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <span className="text-xs text-muted-foreground">PNG, JPEG, WEBP oder GIF, max. 2 MB.</span>
        </div>
      </div>

      <span className="mb-2 block text-xs text-muted-foreground">Oder ein Standardbild wählen:</span>
      <div className="flex gap-3">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={saving}
            onClick={() => handlePresetSelect(preset)}
            className="cursor-pointer rounded-full border-none bg-transparent p-0"
          >
            <img src={`/avatars/${preset}.svg`} alt={preset} width={40} height={40} className="block rounded-full" />
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
