import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_STATUSES = ["draft", "finalized", "cancelled"];
const VALID_SENT_STATUSES = ["not_sent", "sent"];
const VALID_PAYMENT_STATUSES = ["not_received", "partially_received", "fully_received"];

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const purchaseOrders = await context.tenantDb.purchaseOrder.findMany({
    where: isPrivileged ? undefined : { project: { members: { some: { userId: context.currentUser.id } } } },
    orderBy: { orderedAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ purchaseOrders });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.projectId !== "string" || body.projectId.trim().length === 0) {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }
  if (typeof body.vendorName !== "string" || body.vendorName.trim().length === 0) {
    return NextResponse.json({ error: "vendorName ist erforderlich." }, { status: 400 });
  }
  if (typeof body.amount !== "number" || !Number.isFinite(body.amount)) {
    return NextResponse.json({ error: "amount muss eine Zahl sein." }, { status: 400 });
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "status ist ungültig." }, { status: 400 });
  }
  if (body.sentStatus !== undefined && !VALID_SENT_STATUSES.includes(body.sentStatus)) {
    return NextResponse.json({ error: "sentStatus ist ungültig." }, { status: 400 });
  }
  if (body.paymentStatus !== undefined && !VALID_PAYMENT_STATUSES.includes(body.paymentStatus)) {
    return NextResponse.json({ error: "paymentStatus ist ungültig." }, { status: 400 });
  }
  const orderedAt = typeof body.orderedAt === "string" && !Number.isNaN(Date.parse(body.orderedAt)) ? new Date(body.orderedAt) : new Date();

  const purchaseOrder = await context.tenantDb.purchaseOrder.create({
    data: {
      projectId: body.projectId,
      vendorName: body.vendorName,
      amount: body.amount,
      status: body.status ?? "draft",
      sentStatus: body.sentStatus ?? "not_sent",
      paymentStatus: body.paymentStatus ?? "not_received",
      orderedAt,
      createdById: context.currentUser.id,
    },
    include: { project: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ purchaseOrder }, { status: 201 });
}
