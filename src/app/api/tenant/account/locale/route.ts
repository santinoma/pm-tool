import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

const VALID_LOCALES = ["de", "en"];

export async function PATCH(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !VALID_LOCALES.includes(body.locale)) {
    return NextResponse.json({ error: `locale muss eines von ${VALID_LOCALES.join(", ")} sein.` }, { status: 400 });
  }

  const updated = await context.tenantDb.user.update({
    where: { id: context.currentUser.id },
    data: { locale: body.locale },
  });

  return NextResponse.json({ locale: updated.locale });
}
