import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { computeOverdueTasks } from "@/tenant/reporting/overdue";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

export const dynamic = "force-dynamic";

export default async function OverdueReportPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const now = new Date();
  const tasks = await context.tenantDb.task.findMany({
    where: { inTriage: false },
    include: {
      status: true,
      assignee: true,
      projects: { where: { isPrimary: true }, include: { project: true } },
    },
  });

  const overdue = computeOverdueTasks(
    tasks.map((task) => ({ id: task.id, dueDate: task.dueDate, statusCategory: task.status.category })),
    now,
  );
  const overdueIds = new Set(overdue.map((task) => task.id));
  const rows = tasks.filter((task) => overdueIds.has(task.id));

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Überfällig"
    >
      <div className="mx-auto max-w-3xl pb-10">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Überfällige Tasks</h1>
        <p className="mb-6 text-sm text-muted-foreground">Cross-projekt, alle noch nicht erledigten Tasks mit vergangener Fälligkeit.</p>

        {rows.length === 0 ? (
          <div className="rounded-lg border py-14 text-center">
            <h3 className="font-semibold">Keine überfälligen Tasks</h3>
            <p className="mt-1 text-sm text-muted-foreground">Alle fälligen Arbeiten sind im Zeitplan.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead className="text-right">Fällig</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{task.title}</TableCell>
                    <TableCell className="text-muted-foreground">{task.projects[0]?.project.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{task.assignee?.name ?? task.assignee?.email ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("de-DE") : "—"}</TableCell>
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
