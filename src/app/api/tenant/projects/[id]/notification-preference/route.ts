import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

const VALID_LEVELS = ["all", "mentions", "off"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const preference = await context.tenantDb.notificationPreference.findUnique({
    where: { userId_projectId: { userId: context.currentUser.id, projectId: id } },
  });

  return NextResponse.json({ level: preference?.level ?? "all" });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !VALID_LEVELS.includes(body.level)) {
    return NextResponse.json({ error: "Ungültiges Level." }, { status: 400 });
  }

  const preference = await context.tenantDb.notificationPreference.upsert({
    where: { userId_projectId: { userId: context.currentUser.id, projectId: id } },
    create: { userId: context.currentUser.id, projectId: id, level: body.level },
    update: { level: body.level },
  });

  return NextResponse.json({ level: preference.level });
}
