import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

const VALID_STAGES = ["lead", "qualified", "proposal", "won", "lost"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (body.stage !== undefined && !VALID_STAGES.includes(body.stage)) {
    return NextResponse.json({ error: "stage ist ungültig." }, { status: 400 });
  }
  if (body.stage === "lost" && (typeof body.lostReason !== "string" || body.lostReason.trim().length === 0)) {
    return NextResponse.json({ error: "lostReason ist erforderlich, wenn ein Deal auf 'lost' gesetzt wird." }, { status: 400 });
  }

  const deal = await context.tenantDb.deal.update({
    where: { id },
    data: {
      title: typeof body.title === "string" ? body.title : undefined,
      stage: typeof body.stage === "string" ? body.stage : undefined,
      lostReason: body.stage === "lost" ? body.lostReason.trim() : typeof body.lostReason === "string" ? body.lostReason.trim() : undefined,
      estimatedValue: typeof body.estimatedValue === "number" ? body.estimatedValue : undefined,
      probability: typeof body.probability === "number" ? body.probability : undefined,
      projectId: body.projectId === null ? null : typeof body.projectId === "string" ? body.projectId : undefined,
    },
  });

  return NextResponse.json({ deal });
}
