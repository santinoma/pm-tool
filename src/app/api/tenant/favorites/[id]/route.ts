import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  // Nutzer dürfen nur ihre eigenen Favoriten löschen — deleteMany mit userId im
  // Filter statt delete-by-id-only, damit ein fremdes Favorite nicht gelöscht werden kann.
  const result = await context.tenantDb.favorite.deleteMany({
    where: { id, userId: context.currentUser.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Favorit nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
