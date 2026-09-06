"use client";

import { useState } from "react";
import { Button } from "@/ui/shadcn/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/components/dialog";
import { Input } from "@/ui/shadcn/components/input";
import { Label } from "@/ui/shadcn/components/label";

interface RowError {
  row: number;
  errors: string[];
}

export function CsvImportModal({
  title,
  importUrl,
  templateUrl,
  onClose,
  onImported,
}: {
  title: string;
  importUrl: string;
  templateUrl: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setGeneralError(null);
    setRowErrors([]);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(importUrl, { method: "POST", body: formData });
    setImporting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (Array.isArray(body.rowErrors)) {
        setRowErrors(body.rowErrors);
      }
      setGeneralError(body.error ?? "Import fehlgeschlagen.");
      return;
    }

    onImported();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <a href={templateUrl} className="text-sm text-primary hover:underline">
          Vorlage herunterladen
        </a>

        <div>
          <Label htmlFor="csv-import-file" className="mb-2 block">
            CSV-Datei
          </Label>
          <Input
            id="csv-import-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>

        {generalError && <p className="text-sm text-destructive">{generalError}</p>}

        {rowErrors.length > 0 && (
          <div>
            <strong className="text-sm">Fehlerhafte Zeilen:</strong>
            <ul className="mt-1 flex flex-col gap-1">
              {rowErrors.map((rowError) => (
                <li key={rowError.row} className="text-sm text-destructive">
                  Zeile {rowError.row}: {rowError.errors.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" disabled={!file || importing} onClick={handleImport}>
            {importing ? "Importiere…" : "Importieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
