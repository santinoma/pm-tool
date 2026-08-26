"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/ui/components/Avatar";

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
      <span className="field-label" style={{ display: "block", marginBottom: "var(--space-3)" }}>
        Profilbild
      </span>
      <div className="row" style={{ gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <Avatar name={name} email={email} avatarUrl={avatarUrl} size={64} />
        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={saving}
            onClick={() => fileInputRef.current?.click()}
          >
            Eigenes Bild hochladen
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <span className="field-hint">PNG, JPEG, WEBP oder GIF, max. 2 MB.</span>
        </div>
      </div>

      <span className="field-hint" style={{ display: "block", marginBottom: "var(--space-2)" }}>
        Oder ein Standardbild wählen:
      </span>
      <div className="row" style={{ gap: "var(--space-3)" }}>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={saving}
            onClick={() => handlePresetSelect(preset)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", borderRadius: "50%" }}
          >
            <img
              src={`/avatars/${preset}.svg`}
              alt={preset}
              width={40}
              height={40}
              style={{ borderRadius: "50%", display: "block" }}
            />
          </button>
        ))}
      </div>

      {error && <p className="field-error" style={{ marginTop: "var(--space-3)" }}>{error}</p>}
    </div>
  );
}
