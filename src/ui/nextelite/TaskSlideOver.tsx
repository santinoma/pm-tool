"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/ui/shadcn/components/button";

export function TaskSlideOver({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const close = () => router.back();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Schließen"
        onClick={close}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative flex h-full w-full max-w-3xl flex-col border-l bg-background shadow-2xl">
        <div className="flex shrink-0 items-center justify-end border-b px-4 py-2">
          <Button type="button" variant="ghost" size="icon-sm" onClick={close} aria-label="Schließen" title="Schließen (Esc)">
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
