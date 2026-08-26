import { NextResponse } from "next/server";
import { provisionTenant } from "@/platform/provisionTenant";

const VALID_PLANS = ["small", "medium", "enterprise"];
const VALID_ADD_ONS = ["two_factor_scim"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.subdomain !== "string" ||
    typeof body.ownerEmail !== "string" ||
    body.name.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "Name, Subdomain und Owner-E-Mail sind erforderlich." },
      { status: 400 },
    );
  }
  if (body.plan !== undefined && !VALID_PLANS.includes(body.plan)) {
    return NextResponse.json({ error: "Ungültiger plan." }, { status: 400 });
  }
  const addOnFeatures = Array.isArray(body.addOnFeatures)
    ? body.addOnFeatures.filter((key: unknown) => typeof key === "string" && VALID_ADD_ONS.includes(key))
    : [];

  try {
    const result = await provisionTenant({
      name: body.name,
      subdomain: body.subdomain,
      ownerEmail: body.ownerEmail,
      targetConnectionString:
        typeof body.targetConnectionString === "string" && body.targetConnectionString.trim().length > 0
          ? body.targetConnectionString
          : undefined,
      plan: body.plan ?? "small",
      addOnFeatures,
    });
    if (result.status === "failed") {
      return NextResponse.json(
        { error: result.error ?? "Provisionierung fehlgeschlagen." },
        { status: 500 },
      );
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
