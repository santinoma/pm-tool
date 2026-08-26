import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { buildStoragePath, saveUploadedFile } from "@/tenant/collaboration/attachmentStorage";
import { recordActivity } from "@/tenant/notifications/recordActivity";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const attachments = await context.tenantDb.attachment.findMany({
    where: { taskId: id },
    include: { uploadedBy: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ attachments });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Datei ist erforderlich." }, { status: 400 });
  }

  const storagePath = buildStoragePath(id, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveUploadedFile(storagePath, buffer);

  const attachment = await context.tenantDb.attachment.create({
    data: {
      taskId: id,
      uploadedById: context.currentUser.id,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.byteLength,
      storagePath,
    },
  });

  const task = await context.tenantDb.task.findUnique({
    where: { id },
    select: { title: true, projects: { where: { isPrimary: true }, select: { projectId: true } } },
  });
  const primaryProjectId = task?.projects[0]?.projectId;
  if (primaryProjectId) {
    await recordActivity(context.tenantDb, {
      projectId: primaryProjectId,
      actorId: context.currentUser.id,
      type: "attachment_added",
      summary: `Anhang „${file.name}“ zu „${task?.title}“ hinzugefügt`,
    });
  }

  return NextResponse.json({ attachment }, { status: 201 });
}
