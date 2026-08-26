import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { buildStoragePath, saveUploadedFile, readUploadedFile } from "../src/tenant/collaboration/attachmentStorage";
import type { Tenant } from "../src/platform/tenantRegistry";
import { rm } from "node:fs/promises";

let tenant: Tenant;
let uploaderId: string;
let taskId: string;
const testDir = `${process.cwd()}/tests-tmp-uploads-attachments`;

beforeEach(async () => {
  process.env.UPLOADS_DIR = testDir;
  const subdomain = `attach-${Date.now()}`;
  await provisionTenant({ name: "Attach Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const uploader = await tenantDb.user.create({ data: { email: "up@example.com", role: "member" } });
  uploaderId = uploader.id;
  const project = await tenantDb.project.create({
    data: { name: "Attach Project", statuses: { create: defaultWorkflowStatuses() } },
    include: { statuses: true },
  });
  const task = await tenantDb.task.create({
    data: {
      title: "Task",
      statusId: project.statuses[0].id,
      projects: { create: { projectId: project.id } },
    },
  });
  taskId = task.id;
});

afterEach(async () => {
  delete process.env.UPLOADS_DIR;
  await rm(testDir, { recursive: true, force: true });
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("attachments (data layer, mirrors the API route logic)", () => {
  it("stores an attachment record and the file content is retrievable byte-identically", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const content = Buffer.from("PDF content here");
    const storagePath = buildStoragePath(taskId, "report.pdf");
    await saveUploadedFile(storagePath, content);

    const attachment = await tenantDb.attachment.create({
      data: {
        taskId,
        uploadedById: uploaderId,
        filename: "report.pdf",
        mimeType: "application/pdf",
        sizeBytes: content.byteLength,
        storagePath,
      },
    });

    const readBack = await readUploadedFile(attachment.storagePath);
    expect(readBack.equals(content)).toBe(true);
    expect(attachment.filename).toBe("report.pdf");
  });

  it("lists attachments for a task", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const storagePath = buildStoragePath(taskId, "a.txt");
    await saveUploadedFile(storagePath, Buffer.from("x"));
    await tenantDb.attachment.create({
      data: {
        taskId,
        uploadedById: uploaderId,
        filename: "a.txt",
        mimeType: "text/plain",
        sizeBytes: 1,
        storagePath,
      },
    });

    const attachments = await tenantDb.attachment.findMany({ where: { taskId } });
    expect(attachments).toHaveLength(1);
  });
});
