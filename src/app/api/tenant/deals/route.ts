import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

const VALID_STAGES = ["lead", "qualified", "proposal", "won", "lost"];

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const deals = await context.tenantDb.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: { select: { id: true, name: true } }, owner: { select: { name: true, email: true } } },
  });
  return NextResponse.json({ deals });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "title ist erforderlich." }, { status: 400 });
  }
  if (typeof body.companyId !== "string" || body.companyId.trim().length === 0) {
    return NextResponse.json({ error: "companyId ist erforderlich." }, { status: 400 });
  }
  if (body.stage !== undefined && !VALID_STAGES.includes(body.stage)) {
    return NextResponse.json({ error: "stage ist ungültig." }, { status: 400 });
  }

  const deal = await context.tenantDb.deal.create({
    data: {
      title: body.title,
      companyId: body.companyId,
      stage: body.stage ?? "lead",
      ownerId: typeof body.ownerId === "string" && body.ownerId.length > 0 ? body.ownerId : context.currentUser.id,
      estimatedValue: typeof body.estimatedValue === "number" ? body.estimatedValue : null,
      probability: typeof body.probability === "number" ? body.probability : null,
      projectId: typeof body.projectId === "string" && body.projectId.length > 0 ? body.projectId : null,
    },
    include: { company: { select: { id: true, name: true } }, owner: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ deal }, { status: 201 });
}
