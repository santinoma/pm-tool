"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent } from "@/ui/shadcn/components/card";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

interface LogEntry {
  id: string;
  periodKey: string;
  answer: string;
  userLabel: string;
  createdAt: string;
}

interface Schedule {
  id: string;
  question: string;
  recurrence: string;
  pending: boolean;
  myAnswer: string;
  log: LogEntry[];
}

export function CheckInsClient({
  projectId,
  canManage,
  schedules,
}: {
  projectId: string;
  canManage: boolean;
  schedules: Schedule[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [newQuestion, setNewQuestion] = useState("");
  const [newRecurrence, setNewRecurrence] = useState("weekly");
  const [error, setError] = useState<string | null>(null);

  async function submitAnswer(scheduleId: string) {
    const answer = answers[scheduleId];
    if (!answer || answer.trim().length === 0) return;
    await fetch(`/api/tenant/check-ins/${scheduleId}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    router.refresh();
  }

  async function handleCreateSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/tenant/projects/${projectId}/check-ins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: newQuestion, recurrence: newRecurrence }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Erstellung fehlgeschlagen.");
      return;
    }
    setNewQuestion("");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Check-ins</h1>

      {schedules.length === 0 ? (
        <div className="mb-6 rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Check-in-Schedules</h3>
        </div>
      ) : (
        <div className="mb-8 flex flex-col gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="flex flex-col gap-3">
                <h2 className="text-base font-semibold">
                  {schedule.question} <small className="text-xs font-normal text-muted-foreground">({schedule.recurrence})</small>
                </h2>
                {schedule.pending ? (
                  <div className="flex gap-2">
                    <Input
                      value={answers[schedule.id] ?? ""}
                      onChange={(event) => setAnswers((prev) => ({ ...prev, [schedule.id]: event.target.value }))}
                      placeholder="Deine Antwort…"
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => submitAnswer(schedule.id)}>
                      Absenden
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Für diese Periode bereits beantwortet: „{schedule.myAnswer}“</p>
                )}

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Log</h3>
                  {schedule.log.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Noch keine Antworten.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {schedule.log.map((entry) => (
                        <li key={entry.id} className="text-sm">
                          <span className="mr-2 text-xs text-muted-foreground">[{entry.periodKey}]</span>
                          {entry.userLabel}: {entry.answer}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canManage && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Neues Check-in-Schedule anlegen</h2>
          <form onSubmit={handleCreateSchedule} className="flex gap-2">
            <Input
              value={newQuestion}
              onChange={(event) => setNewQuestion(event.target.value)}
              placeholder="Frage, z. B. 'Was hast du diese Woche gemacht?'"
              required
              className="flex-1"
            />
            <Select value={newRecurrence} onValueChange={setNewRecurrence}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Täglich</SelectItem>
                <SelectItem value="weekly">Wöchentlich</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Anlegen</Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
