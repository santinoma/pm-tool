"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/ui/shadcn/components/button";
import { cn } from "@/ui/shadcn/lib/utils";

export function FavoriteButton({
  entityType,
  entityId,
  initialFavorited,
  onChange,
  size = "sm",
}: {
  entityType: "project" | "task" | "wiki_page";
  entityId: string;
  initialFavorited: boolean;
  onChange?: (favorited: boolean) => void;
  size?: "sm" | "md";
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !favorited;
    setFavorited(next);
    try {
      if (next) {
        await fetch("/api/tenant/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityType, entityId }),
        });
      } else {
        await fetch(
          `/api/tenant/favorites?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
          { method: "DELETE" },
        );
      }
      onChange?.(next);
      window.dispatchEvent(new CustomEvent("favorites-changed"));
    } catch {
      setFavorited(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-pressed={favorited}
      aria-label={favorited ? "Von Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      title={favorited ? "Von Favoriten entfernen" : "Zu Favoriten hinzufügen"}
    >
      <Star className={cn(size === "md" && "size-4.5", favorited && "fill-primary text-primary")} />
    </Button>
  );
}
