import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { generateApiKey } from "@/tenant/apiKeys/apiKeyToken";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const keys = await context.tenantDb.apiKey.findMany({
    where: { userId: context.currentUser.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      tokenPrefix: key.tokenPrefix,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
      createdAt: key.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }

  const generated = generateApiKey();
  const key = await context.tenantDb.apiKey.create({
    data: {
      name: body.name,
      tokenHash: generated.tokenHash,
      tokenPrefix: generated.tokenPrefix,
      userId: context.currentUser.id,
    },
  });

  return NextResponse.json({ id: key.id, name: key.name, token: generated.token }, { status: 201 });
}
