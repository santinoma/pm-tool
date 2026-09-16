import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateDefaultPipeline } from "@/tenant/deals/pipeline";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const deals = await context.tenantDb.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { name: true, email: true } },
      status: true,
    },
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

  let statusId: string;
  if (typeof body.statusId === "string" && body.statusId.length > 0) {
    const status = await context.tenantDb.dealStatus.findUnique({ where: { id: body.statusId } });
    if (!status) {
      return NextResponse.json({ error: "statusId ist ungültig." }, { status: 400 });
    }
    statusId = status.id;
  } else {
    const defaultPipeline = await getOrCreateDefaultPipeline(context.tenantDb);
    const firstStatus = await context.tenantDb.dealStatus.findFirst({
      where: { pipelineId: defaultPipeline.id },
      orderBy: { position: "asc" },
    });
    if (!firstStatus) {
      return NextResponse.json({ error: "Keine Pipeline mit Status gefunden." }, { status: 409 });
    }
    statusId = firstStatus.id;
  }

  const deal = await context.tenantDb.deal.create({
    data: {
      title: body.title,
      companyId: body.companyId,
      statusId,
      ownerId: typeof body.ownerId === "string" && body.ownerId.length > 0 ? body.ownerId : context.currentUser.id,
      estimatedValue: typeof body.estimatedValue === "number" ? body.estimatedValue : null,
      probability: typeof body.probability === "number" ? body.probability : null,
      projectId: typeof body.projectId === "string" && body.projectId.length > 0 ? body.projectId : null,
    },
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { name: true, email: true } },
      status: true,
    },
  });

  return NextResponse.json({ deal }, { status: 201 });
}
