import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readUploadedFile, resolveUploadsDir, saveUploadedFile, buildStoragePath } from "../src/tenant/collaboration/attachmentStorage";
import { rm } from "node:fs/promises";

describe("buildStoragePath", () => {
  it("never includes the original filename verbatim in the path", () => {
    const storagePath = buildStoragePath("task-123", "../../etc/passwd");
    expect(storagePath).not.toContain("etc/passwd");
    expect(storagePath).not.toContain("..");
  });

  it("keeps a safe file extension when present", () => {
    const storagePath = buildStoragePath("task-123", "report.pdf");
    expect(storagePath.endsWith(".pdf")).toBe(true);
  });

  it("drops unsafe or overly long extensions", () => {
    const storagePath = buildStoragePath("task-123", "file.someveryunusualextension");
    expect(storagePath.endsWith(".someveryunusualextension")).toBe(false);
  });

  it("scopes the path under the given taskId", () => {
    const storagePath = buildStoragePath("task-123", "a.txt");
    expect(storagePath.startsWith("task-123/")).toBe(true);
  });

  it("generates distinct paths for repeated calls", () => {
    const a = buildStoragePath("task-123", "a.txt");
    const b = buildStoragePath("task-123", "a.txt");
    expect(a).not.toBe(b);
  });
});

describe("saveUploadedFile / readUploadedFile", () => {
  const testDir = `${process.cwd()}/tests-tmp-uploads`;

  beforeEach(() => {
    process.env.UPLOADS_DIR = testDir;
  });

  afterEach(async () => {
    delete process.env.UPLOADS_DIR;
    await rm(testDir, { recursive: true, force: true });
  });

  it("writes and reads back the same byte content", async () => {
    const storagePath = buildStoragePath("task-abc", "hello.txt");
    const content = Buffer.from("hello world");

    await saveUploadedFile(storagePath, content);
    const readBack = await readUploadedFile(storagePath);

    expect(readBack.equals(content)).toBe(true);
    expect(resolveUploadsDir()).toBe(testDir);
  });
});
