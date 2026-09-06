"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";

interface SessionRow {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  isCurrent: boolean;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("de-DE");
}

export function SessionsClient({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    await fetch(`/api/tenant/sessions/${id}`, { method: "DELETE" });
    setRevokingId(null);
    router.refresh();
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Aktive Sitzungen</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Geräte und Browser, in denen du aktuell angemeldet bist.
      </p>

      {sessions.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">Keine aktiven Sitzungen.</p>
      ) : (
        <ul className="mb-4 overflow-hidden rounded-lg border">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-0">
              <span>
                <span className="text-muted-foreground">{session.userAgent ?? "Unbekanntes Gerät"}</span>{" "}
                <span className="text-xs text-muted-foreground/70">
                  · Angemeldet seit {formatDate(session.createdAt)} · zuletzt aktiv {formatDate(session.lastSeenAt)}
                </span>
              </span>
              {session.isCurrent ? (
                <Badge variant="outline">Diese Sitzung</Badge>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRevoke(session.id)}
                  disabled={revokingId === session.id}
                >
                  Abmelden
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
