import { getTenantContext } from "@/tenant/context";
import { isSharedViewValid } from "@/tenant/sharedViews/sharedViewAccess";
import { Badge } from "@/ui/shadcn/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

export const dynamic = "force-dynamic";

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm">
        <h1 className="mb-3 text-xl font-bold tracking-tight">Link nicht verfügbar</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default async function SharedViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const context = await getTenantContext();
  if (!context) {
    return <ErrorPage message="Unbekannter Tenant." />;
  }

  const view = await context.tenantDb.sharedView.findUnique({
    where: { token },
    include: { project: true },
  });
  if (!view) {
    return <ErrorPage message="Dieser Link existiert nicht." />;
  }

  const validation = isSharedViewValid(view);
  if (!validation.valid) {
    return (
      <ErrorPage
        message={validation.reason === "revoked" ? "Dieser Link wurde widerrufen." : "Dieser Link ist abgelaufen."}
      />
    );
  }

  const tasks = await context.tenantDb.task.findMany({
    where: {
      inTriage: false,
      isPrivate: false,
      projects: { some: { projectId: view.projectId } },
      status: view.statusCategoryFilter ? { category: view.statusCategoryFilter } : undefined,
    },
    include: { status: true, assignee: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-dvh bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-3xl">
        <Badge variant="secondary" className="mb-2">
          Freigegebene Ansicht
        </Badge>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{view.project.name}</h1>

        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Tasks.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Zuständig</TableHead>
                  <TableHead>Fällig</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.status.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.assignee?.name ?? task.assignee?.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
