import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const contacts = await context.tenantDb.clientContact.findMany({
    where: { clientId: id },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ contacts });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }

  const isPrimary = Boolean(body.isPrimary);

  const contact = await context.tenantDb.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.clientContact.updateMany({ where: { clientId: id, isPrimary: true }, data: { isPrimary: false } });
    }
    return tx.clientContact.create({
      data: {
        clientId: id,
        name: body.name,
        title: typeof body.title === "string" && body.title.trim().length > 0 ? body.title : null,
        email: typeof body.email === "string" && body.email.trim().length > 0 ? body.email : null,
        phone: typeof body.phone === "string" && body.phone.trim().length > 0 ? body.phone : null,
        isPrimary,
      },
    });
  });

  return NextResponse.json({ contact }, { status: 201 });
}
