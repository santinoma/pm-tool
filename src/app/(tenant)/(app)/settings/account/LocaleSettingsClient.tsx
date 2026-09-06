"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/ui/shadcn/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { t, type Locale } from "@/tenant/i18n/dictionary";

const LOCALES = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
];

export function LocaleSettingsClient({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [value, setValue] = useState(locale);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: string) {
    setValue(next as Locale);
    setSaving(true);
    await fetch("/api/tenant/account/locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="max-w-[220px]">
      <Label htmlFor="account-locale" className="mb-2 block">
        {t(locale, "settings.account.language")}
      </Label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger id="account-locale" disabled={saving} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LOCALES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-2 text-xs text-muted-foreground">{t(locale, "settings.account.languageHint")}</p>
    </div>
  );
}
