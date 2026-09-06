import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AbsenceClient } from "./AbsenceClient";

export const dynamic = "force-dynamic";

export default async function BookAbsencePage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  const isAdmin = canManageMembers(context.currentUser.role);

  const [myRequests, pendingQueue] = await Promise.all([
    context.tenantDb.absenceRequest.findMany({
      where: { userId: context.currentUser.id },
      orderBy: { createdAt: "desc" },
    }),
    isAdmin
      ? context.tenantDb.absenceRequest.findMany({
          where: { status: "pending" },
          include: { user: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <AbsenceClient
      isAdmin={isAdmin}
      myRequests={myRequests.map((request) => ({
        id: request.id,
        type: request.type,
        startDate: request.startDate.toISOString().slice(0, 10),
        endDate: request.endDate.toISOString().slice(0, 10),
        status: request.status,
        note: request.note,
      }))}
      pendingQueue={pendingQueue.map((request) => ({
        id: request.id,
        type: request.type,
        startDate: request.startDate.toISOString().slice(0, 10),
        endDate: request.endDate.toISOString().slice(0, 10),
        note: request.note,
        userName: request.user.name ?? request.user.email,
      }))}
    />
  );
}
