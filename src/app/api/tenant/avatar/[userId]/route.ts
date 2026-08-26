import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { readAvatarFile } from "@/tenant/profile/avatarStorage";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const user = await context.tenantDb.user.findUnique({ where: { id: userId } });
  if (!user?.avatarStoragePath || !user.avatarMimeType) {
    return NextResponse.json({ error: "Kein Profilbild vorhanden." }, { status: 404 });
  }

  const fileBuffer = await readAvatarFile(user.avatarStoragePath).catch(() => null);
  if (!fileBuffer) {
    return NextResponse.json({ error: "Datei konnte nicht gelesen werden." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: { "Content-Type": user.avatarMimeType, "Cache-Control": "private, max-age=3600" },
  });
}
