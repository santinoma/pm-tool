import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { NumericCell } from "@/ui/nextelite/NumericCell";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const payments = await context.tenantDb.invoicePayment.findMany({
    where: isPrivileged
      ? undefined
      : { invoice: { budget: { project: { members: { some: { userId: context.currentUser.id } } } } } },
    orderBy: { paidAt: "desc" },
    include: {
      invoice: {
        include: { budget: { include: { project: { select: { id: true, name: true, client: { select: { name: true } } } } } } },
      },
    },
  });

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Zahlungen"
    >
      <div className="py-6">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Zahlungen</h1>
        <p className="mb-6 text-sm text-muted-foreground">Alle Zahlungseingänge projektübergreifend.</p>

        {payments.length === 0 ? (
          <div className="rounded-lg border py-14 text-center">
            <h3 className="font-semibold">Noch keine Zahlungen</h3>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead>Bezahlt am</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Link
                        href={`/financials/${payment.invoice.budget.projectId}/${payment.invoice.budgetId}`}
                        className="font-semibold hover:text-primary hover:underline"
                      >
                        {payment.invoice.budget.project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{payment.invoice.budget.project.client?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{payment.invoice.budget.title}</TableCell>
                    <NumericCell value={payment.amount} className="text-muted-foreground" />
                    <TableCell className="text-muted-foreground">{payment.paidAt.toLocaleDateString("de-DE")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShellNextElite>
  );
}
