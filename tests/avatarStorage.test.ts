import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import {
  buildAvatarStoragePath,
  deleteAvatarFile,
  readAvatarFile,
  saveAvatarFile,
} from "../src/tenant/profile/avatarStorage";

describe("buildAvatarStoragePath", () => {
  it("never includes the original filename verbatim in the path", () => {
    const storagePath = buildAvatarStoragePath("user-123", "../../etc/passwd");
    expect(storagePath).not.toContain("etc/passwd");
    expect(storagePath).not.toContain("..");
  });

  it("keeps a safe file extension when present", () => {
    const storagePath = buildAvatarStoragePath("user-123", "photo.png");
    expect(storagePath.endsWith(".png")).toBe(true);
  });

  it("scopes the path under avatars/<userId>", () => {
    const storagePath = buildAvatarStoragePath("user-123", "a.png");
    expect(storagePath.startsWith("avatars/user-123/")).toBe(true);
  });

  it("generates distinct paths for repeated calls", () => {
    const a = buildAvatarStoragePath("user-123", "a.png");
    const b = buildAvatarStoragePath("user-123", "a.png");
    expect(a).not.toBe(b);
  });
});

describe("saveAvatarFile / readAvatarFile / deleteAvatarFile", () => {
  const testDir = `${process.cwd()}/tests-tmp-avatars`;

  beforeEach(() => {
    process.env.UPLOADS_DIR = testDir;
  });

  afterEach(async () => {
    delete process.env.UPLOADS_DIR;
    await rm(testDir, { recursive: true, force: true });
  });

  it("writes and reads back the same byte content, then deletes it", async () => {
    const storagePath = buildAvatarStoragePath("user-abc", "photo.png");
    const content = Buffer.from("fake-png-bytes");

    await saveAvatarFile(storagePath, content);
    const readBack = await readAvatarFile(storagePath);
    expect(readBack.equals(content)).toBe(true);

    await deleteAvatarFile(storagePath);
    await expect(readAvatarFile(storagePath)).rejects.toThrow();
  });
});
