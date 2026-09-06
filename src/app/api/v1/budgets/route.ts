import { NextResponse } from "next/server";
import { authenticateApiKey, authFailureResponse } from "@/tenant/apiKeys/authenticateApiKey";

// v1 is read-only for budgets — no financial mutation is exposed via the
// public API yet, so only GET is implemented here (even for read_write keys).
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return authFailureResponse(auth);

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }

  const budgets = await auth.tenantDb.budget.findMany({
    where: { projectId },
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    budgets: budgets.map((budget) => ({
      id: budget.id,
      title: budget.title,
      projectId: budget.projectId,
      owner: budget.owner.email,
      isRetainer: budget.isRetainer,
      startDate: budget.startDate,
      endDate: budget.endDate,
      deliveredAt: budget.deliveredAt,
    })),
  });
}
