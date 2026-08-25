import { NextResponse } from "next/server";
import { provisionTenant } from "@/platform/provisionTenant";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.subdomain !== "string" ||
    body.name.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "Name und Subdomain sind erforderlich." },
      { status: 400 },
    );
  }

  try {
    const result = await provisionTenant({ name: body.name, subdomain: body.subdomain });
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
