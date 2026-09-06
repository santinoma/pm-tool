"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Umbrella } from "lucide-react";
import type { UserWeekSummary, DaySummary } from "@/tenant/companyTime/weekSummary";

import { Button } from "@/ui/shadcn/components/button";
import { Card } from "@/ui/shadcn/components/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/shadcn/components/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { cn } from "@/ui/shadcn/lib/utils";

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function formatDayLabel(date: string, index: number): string {
  const [, month, day] = date.split("-");
  return `${DAY_LABELS[index]} ${Number(day)}.${Number(month)}.`;
}

export function CompanyTimeClient({
  isEntriesMode,
  weekDates,
  summary,
  previousWeek,
  nextWeek,
}: {
  isEntriesMode: boolean;
  weekDates: string[];
  summary: UserWeekSummary[];
  previousWeek: string;
  nextWeek: string;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<{ userLabel: string; day: DaySummary } | null>(null);

  function goToWeek(date: string) {
    router.push(`/time/company?week=${date}`);
  }

  return (
    <div className="pb-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Company Time</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => goToWeek(previousWeek)}>
            <ChevronLeft className="size-4" />
            Vorherige Woche
          </Button>
          <Button variant="outline" size="sm" onClick={() => goToWeek(nextWeek)}>
            Nächste Woche
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              {weekDates.map((date, index) => (
                <TableHead key={date} className="text-center">
                  {formatDayLabel(date, index)}
                </TableHead>
              ))}
              <TableHead className="text-center">Summe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.map((row) => (
              <TableRow key={row.userId}>
                <TableCell>{row.userLabel}</TableCell>
                {row.days.map((day) => (
                  <TableCell
                    key={day.date}
                    className={cn(
                      "text-center",
                      isEntriesMode && day.entries.length > 0 && "cursor-pointer",
                      day.isAbsence && "bg-primary/10",
                    )}
                    onClick={() => {
                      if (isEntriesMode && day.entries.length > 0) {
                        setDetail({ userLabel: row.userLabel, day });
                      }
                    }}
                  >
                    {day.hours > 0 ? `${day.hours}h` : "—"}
                    {day.isAbsence && <Umbrella className="ml-1 inline size-3" aria-label="Genehmigte Abwesenheit" />}
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  <strong>{row.totalHours}h</strong>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        {detail && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {detail.userLabel} · {detail.day.date}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              {detail.day.entries.map((entry, index) => (
                <Card key={index} className="p-3">
                  {entry.timeRange && <span className="mb-1 block font-mono text-xs text-muted-foreground">{entry.timeRange}</span>}
                  {entry.serviceLabel && <strong className="block text-sm">{entry.serviceLabel}</strong>}
                  <span className="text-sm text-muted-foreground">{entry.description ?? "—"}</span>
                </Card>
              ))}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
