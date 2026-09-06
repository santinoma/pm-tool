import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const tags = await context.tenantDb.tag.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ tags });
}
