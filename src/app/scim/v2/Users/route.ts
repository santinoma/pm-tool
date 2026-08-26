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

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Unbekannter Tenant." }, { status: 404 });
  }
  if (!(await authenticate(request, context.tenantDb))) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const filter = new URL(request.url).searchParams.get("filter");
  let userNameFilter: string | null = null;
  const match = filter?.match(/userName\s+eq\s+"([^"]+)"/i);
  if (match) {
    userNameFilter = match[1];
  }

  const users = await context.tenantDb.user.findMany({
    where: userNameFilter ? { email: userNameFilter } : undefined,
  });

  const resources = users.map(toScimUser);
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: resources.length,
    Resources: resources,
  });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Unbekannter Tenant." }, { status: 404 });
  }
  if (!(await authenticate(request, context.tenantDb))) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.userName !== "string") {
    return NextResponse.json({ error: "userName ist erforderlich." }, { status: 400 });
  }

  const existing = await context.tenantDb.user.findUnique({ where: { email: body.userName } });
  if (existing) {
    return NextResponse.json({ error: "Nutzer existiert bereits." }, { status: 409 });
  }

  const user = await context.tenantDb.user.create({
    data: {
      email: body.userName,
      name: body.name?.formatted ?? null,
      isActive: body.active !== false,
    },
  });

  return NextResponse.json(toScimUser(user), { status: 201 });
}
