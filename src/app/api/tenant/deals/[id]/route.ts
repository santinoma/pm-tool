import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

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

  let newStatus: { id: string; category: string } | null = null;
  if (typeof body.statusId === "string") {
    const status = await context.tenantDb.dealStatus.findUnique({ where: { id: body.statusId } });
    if (!status) {
      return NextResponse.json({ error: "statusId ist ungültig." }, { status: 400 });
    }
    newStatus = status;
  }

  // Reference "Losing a Deal": a Lost Reason (from the managed catalog) is required
  // whenever a deal moves into a Lost-category status.
  if (newStatus?.category === "lost" && typeof body.lostReasonId !== "string") {
    return NextResponse.json({ error: "lostReasonId ist erforderlich, wenn ein Deal auf 'Lost' gesetzt wird." }, { status: 400 });
  }
  if (typeof body.lostReasonId === "string") {
    const lostReason = await context.tenantDb.lostReason.findUnique({ where: { id: body.lostReasonId } });
    if (!lostReason) {
      return NextResponse.json({ error: "lostReasonId ist ungültig." }, { status: 400 });
    }
  }

  const deal = await context.tenantDb.deal.update({
    where: { id },
    data: {
      title: typeof body.title === "string" ? body.title : undefined,
      statusId: newStatus?.id,
      lostReasonId: body.lostReasonId === null ? null : typeof body.lostReasonId === "string" ? body.lostReasonId : undefined,
      lostReasonNote: body.lostReasonNote === null ? null : typeof body.lostReasonNote === "string" ? body.lostReasonNote : undefined,
      estimatedValue: typeof body.estimatedValue === "number" ? body.estimatedValue : undefined,
      probability: typeof body.probability === "number" ? body.probability : undefined,
      projectId: body.projectId === null ? null : typeof body.projectId === "string" ? body.projectId : undefined,
    },
    include: { status: true },
  });

  return NextResponse.json({ deal });
}
