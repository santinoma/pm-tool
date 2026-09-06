import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { HolidayCalendarsClient } from "./HolidayCalendarsClient";

export const dynamic = "force-dynamic";

export default async function HolidayCalendarsSettingsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  if (!canManageMembers(context.currentUser.role)) {
    redirect("/settings");
  }

  const holidayCalendars = await context.tenantDb.holidayCalendar.findMany({
    include: { holidays: { orderBy: { date: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Feiertagskalender"
    >
      <HolidayCalendarsClient
        holidayCalendars={holidayCalendars.map((calendar) => ({
          id: calendar.id,
          name: calendar.name,
          country: calendar.country,
          holidays: calendar.holidays.map((holiday) => ({
            id: holiday.id,
            date: holiday.date.toISOString(),
            name: holiday.name,
          })),
        }))}
      />
    </AppShellNextElite>
  );
}
