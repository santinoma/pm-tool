import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const SAFE_EXTENSION_PATTERN = /^[a-zA-Z0-9]{1,10}$/;

function extractSafeExtension(originalFilename: string): string {
  const dotIndex = originalFilename.lastIndexOf(".");
  if (dotIndex === -1) {
    return "";
  }
  const candidate = originalFilename.slice(dotIndex + 1);
  return SAFE_EXTENSION_PATTERN.test(candidate) ? `.${candidate}` : "";
}

/**
 * Baut einen sicheren, relativen Speicherpfad für einen Task-Anhang. Der Original-Dateiname
 * fließt NIE als Verzeichnis-/Dateinamen-Bestandteil ein (nur als separates Metadatenfeld
 * `filename` gespeichert) — verhindert Path-Traversal über manipulierte Dateinamen.
 */
export function buildStoragePath(taskId: string, originalFilename: string): string {
  const extension = extractSafeExtension(originalFilename);
  return path.posix.join(taskId, `${randomUUID()}${extension}`);
}

export function resolveUploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
}

export async function saveUploadedFile(storagePath: string, data: Buffer): Promise<void> {
  // UPLOADS_DIR ist zur Laufzeit dynamisch (Docker-Volume-Pfad, per Env-Var konfiguriert) —
  // in unserem Container-Deployment (kein Serverless-Bundling) ist Next.js' Dateispuren-
  // Warnung dafür nicht relevant, daher bewusst ignoriert statt den Pfad künstlich statisch zu machen.
  const fullPath = path.join(/*turbopackIgnore: true*/ resolveUploadsDir(), storagePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
}

export async function readUploadedFile(storagePath: string): Promise<Buffer> {
  const fullPath = path.join(/*turbopackIgnore: true*/ resolveUploadsDir(), storagePath);
  return readFile(/*turbopackIgnore: true*/ fullPath);
}
