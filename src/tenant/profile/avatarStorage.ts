import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

const SAFE_EXTENSION_PATTERN = /^[a-zA-Z0-9]{1,10}$/;
export const ALLOWED_AVATAR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
export const DEFAULT_AVATAR_PRESETS = ["avatar-1", "avatar-2", "avatar-3", "avatar-4", "avatar-5"];

function extractSafeExtension(originalFilename: string): string {
  const dotIndex = originalFilename.lastIndexOf(".");
  if (dotIndex === -1) {
    return "";
  }
  const candidate = originalFilename.slice(dotIndex + 1);
  return SAFE_EXTENSION_PATTERN.test(candidate) ? `.${candidate}` : "";
}

export function buildAvatarStoragePath(userId: string, originalFilename: string): string {
  const extension = extractSafeExtension(originalFilename);
  return path.posix.join("avatars", userId, `${randomUUID()}${extension}`);
}

function resolveUploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
}

export async function saveAvatarFile(storagePath: string, data: Buffer): Promise<void> {
  const fullPath = path.join(/*turbopackIgnore: true*/ resolveUploadsDir(), storagePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
}

export async function readAvatarFile(storagePath: string): Promise<Buffer> {
  const fullPath = path.join(/*turbopackIgnore: true*/ resolveUploadsDir(), storagePath);
  return readFile(/*turbopackIgnore: true*/ fullPath);
}

export async function deleteAvatarFile(storagePath: string): Promise<void> {
  const fullPath = path.join(/*turbopackIgnore: true*/ resolveUploadsDir(), storagePath);
  await unlink(fullPath).catch(() => undefined);
}
