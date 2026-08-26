import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import type { PrismaClient } from "@/generated/tenant-client/client.js";

function toScimUser(user: { id: string; email: string; name: string | null; isActive: boolean }) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.id,
    userName: user.email,
    name: { formatted: user.name ?? user.email },
    active: user.isActive,
    meta: { resourceType: "User" },
  };
}

async function authenticate(request: Request, tenantDb: PrismaClient) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) return false;

  const settings = await tenantDb.tenantSettings.findFirst();
  return Boolean(settings?.scimBearerToken) && token === settings?.scimBearerToken;
}

async function updateUser(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Unbekannter Tenant." }, { status: 404 });
  }
  if (!(await authenticate(request, context.tenantDb))) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const user = await context.tenantDb.user.update({
    where: { id },
    data: {
      name: body.name?.formatted ?? undefined,
      isActive: typeof body.active === "boolean" ? body.active : undefined,
    },
  });

  return NextResponse.json(toScimUser(user));
}

export const PATCH = updateUser;
export const PUT = updateUser;
