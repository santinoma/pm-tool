import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { listRecentMonths } from "@/tenant/financials/monthClosing";
import { FinancialMonthClosingClient } from "./FinancialMonthClosingClient";

export const dynamic = "force-dynamic";

// Reference "Financial Month Closing: Closing and Securing Financial
// Periods" — org-wide lock of time entries/expenses/services per calendar
// month, distinct from the per-user TimesheetLock (Timesheet Locking).
export default async function FinancialMonthClosingPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const canManage = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "financial_month_closing_manage",
  );
  const settings = await getOrCreateTenantSettings(context.tenantDb);
  const months = await listRecentMonths(context.tenantDb);

  return (
    <AppShellNextElite
      currentUser={{
        name: context.currentUser.name,
        email: context.currentUser.email,
        avatarUrl: context.currentUser.avatarUrl,
        role: context.currentUser.role,
        locale: context.currentUser.locale,
      }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Financial Month Closing"
    >
      <FinancialMonthClosingClient
        canManage={canManage}
        enabled={settings.financialMonthClosingEnabled}
        closingDay={settings.financialMonthClosingDay}
        months={months}
      />
    </AppShellNextElite>
  );
}
