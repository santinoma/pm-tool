import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { computePeriodKey } from "@/tenant/checkIns/period";
import { CheckInsClient } from "./CheckInsClient";

export const dynamic = "force-dynamic";

export default async function CheckInsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  const userId = context.currentUser.id;

  const schedules = await context.tenantDb.checkInSchedule.findMany({
    where: { projectId: id, enabled: true },
    orderBy: { createdAt: "desc" },
  });

  const schedulesWithStatus = await Promise.all(
    schedules.map(async (schedule) => {
      const periodKey = computePeriodKey(new Date(), schedule.recurrence);
      const myResponse = await context.tenantDb.checkInResponse.findUnique({
        where: { scheduleId_userId_periodKey: { scheduleId: schedule.id, userId, periodKey } },
      });
      const allResponses = await context.tenantDb.checkInResponse.findMany({
        where: { scheduleId: schedule.id },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        id: schedule.id,
        question: schedule.question,
        recurrence: schedule.recurrence,
        pending: !myResponse,
        myAnswer: myResponse?.answer ?? "",
        log: allResponses.map((response) => ({
          id: response.id,
          periodKey: response.periodKey,
          answer: response.answer,
          userLabel: response.user.name ?? response.user.email,
          createdAt: response.createdAt.toISOString(),
        })),
      };
    }),
  );

  return (
    <CheckInsClient
      projectId={id}
      canManage={canManageMembers(context.currentUser.role)}
      schedules={schedulesWithStatus}
    />
  );
}
