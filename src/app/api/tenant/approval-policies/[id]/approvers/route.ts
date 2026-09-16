import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_KINDS = ["time", "expense"];
const VALID_ROLE_TYPES = ["budget_owner", "project_manager", "submitter_manager", "specific_person"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !VALID_KINDS.includes(body.kind) || !VALID_ROLE_TYPES.includes(body.roleType)) {
    return NextResponse.json({ error: "kind ('time'|'expense') und roleType sind erforderlich." }, { status: 400 });
  }
  if (body.roleType === "specific_person" && typeof body.specificUserId !== "string") {
    return NextResponse.json({ error: "specificUserId ist erforderlich für roleType 'specific_person'." }, { status: 400 });
  }

  const approver = await context.tenantDb.approvalPolicyApprover.create({
    data: {
      policyId: id,
      kind: body.kind,
      roleType: body.roleType,
      specificUserId: body.roleType === "specific_person" ? body.specificUserId : null,
    },
    include: { specificUser: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ approver }, { status: 201 });
}
