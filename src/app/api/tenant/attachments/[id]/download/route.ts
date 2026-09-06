import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { readUploadedFile } from "@/tenant/collaboration/attachmentStorage";
import { resolveProjectIdsForTask } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertAnyProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const attachment = await context.tenantDb.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "Anhang nicht gefunden." }, { status: 404 });
  }
  const denied = await assertAnyProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdsForTask(context.tenantDb, attachment.taskId),
  );
  if (denied) return denied;

  const fileBuffer = await readUploadedFile(attachment.storagePath).catch(() => null);
  if (!fileBuffer) {
    return NextResponse.json({ error: "Datei konnte nicht gelesen werden." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
    },
  });
}
