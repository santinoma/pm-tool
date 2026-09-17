import { NextResponse } from "next/server";
import { deprovisionTenant } from "@/platform/deprovisionTenant";
import { getTenantById, updateTenantStatus, updateTenantSeatLimit } from "@/platform/tenantRegistry";

const TOGGLEABLE_STATUSES = ["active", "disabled"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || (body.status === undefined && body.seatLimit === undefined)) {
    return NextResponse.json({ error: "status oder seatLimit ist erforderlich." }, { status: 400 });
  }

  const tenant = await getTenantById(id);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }

  let updated = tenant;

  if (body.status !== undefined) {
    if (!TOGGLEABLE_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "status muss 'active' oder 'disabled' sein." }, { status: 400 });
    }
    if (tenant.status !== "active" && tenant.status !== "disabled") {
      return NextResponse.json(
        { error: `Tenant im Status "${tenant.status}" kann nicht umgeschaltet werden.` },
        { status: 409 },
      );
    }
    updated = await updateTenantStatus(id, body.status);
  }

  if (body.seatLimit !== undefined) {
    if (body.seatLimit !== null && (typeof body.seatLimit !== "number" || !Number.isInteger(body.seatLimit) || body.seatLimit < 0)) {
      return NextResponse.json({ error: "seatLimit muss eine nicht-negative ganze Zahl oder null (kein Limit) sein." }, { status: 400 });
    }
    updated = await updateTenantSeatLimit(id, body.seatLimit);
  }

  return NextResponse.json({ tenant: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const result = await deprovisionTenant(id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    const status = message.includes("nicht gefunden") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
