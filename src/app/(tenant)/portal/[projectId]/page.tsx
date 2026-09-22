import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { hasProjectAccess } from "@/tenant/portal/portalAccess";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";
import { NumericCell } from "@/ui/nextelite/NumericCell";

export const dynamic = "force-dynamic";

export default async function PortalProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const access = await context.tenantDb.projectClientAccess.findMany({
    where: { userId: context.currentUser.id },
    select: { projectId: true },
  });
  if (!hasProjectAccess(access.map((entry) => entry.projectId), projectId)) {
    redirect("/portal");
  }

  const [project, tasks, budgets] = await Promise.all([
    context.tenantDb.project.findUnique({ where: { id: projectId } }),
    context.tenantDb.task.findMany({
      where: { inTriage: false, isPrivate: false, projects: { some: { projectId, isPrimary: true } } },
      include: { status: true, assignee: true },
      orderBy: { createdAt: "desc" },
    }),
    context.tenantDb.budget.findMany({
      where: { projectId },
      include: { invoices: { where: { status: { in: ["sent", "paid"] } }, orderBy: { createdAt: "desc" } } },
    }),
  ]);

  if (!project) {
    redirect("/portal");
  }

  const invoices = budgets.flatMap((budget) =>
    budget.invoices.map((invoice) => ({ ...invoice, budgetTitle: budget.title })),
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{project.name}</h1>

      <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
      {tasks.length === 0 ? (
        <p className="mb-8 text-sm text-muted-foreground">Keine Tasks.</p>
      ) : (
        <div className="mb-8 overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Zuständig</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{task.status.name}</TableCell>
                  <TableCell className="text-muted-foreground">{task.assignee?.name ?? task.assignee?.email ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Rechnungen</h2>
      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Rechnungen.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Budget</TableHead>
                <TableHead>Zeitraum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.budgetTitle}</TableCell>
                  <TableCell className="font-mono">
                    {invoice.periodStart.toISOString().slice(0, 10)} – {invoice.periodEnd.toISOString().slice(0, 10)}
                  </TableCell>
                  <TableCell>{invoice.status === "paid" ? "Bezahlt" : "Versendet"}</TableCell>
                  <NumericCell value={invoice.totalAmount} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
