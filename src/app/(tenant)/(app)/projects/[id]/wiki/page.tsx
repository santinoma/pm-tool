import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { getTenantContext } from "@/tenant/context";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

export const dynamic = "force-dynamic";

export default async function WikiListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const pages = await context.tenantDb.wikiPage.findMany({
    where: { projectId: id },
    orderBy: { title: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wiki</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pages.length} {pages.length === 1 ? "Seite" : "Seiten"}
          </p>
        </div>
        <Button asChild>
          <Link href={`/projects/${id}/wiki/new`}>
            <Plus className="size-4" />
            Neue Seite
          </Link>
        </Button>
      </div>
      {pages.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Wiki-Seiten</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seitenname</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead>Zuletzt bearbeitet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell>
                    <Link href={`/projects/${id}/wiki/${page.id}`} className="flex items-center gap-2 font-semibold hover:text-primary">
                      <FileText className="size-4 text-muted-foreground" />
                      {page.title}
                      {page.isTemplate && <Badge variant="secondary">Vorlage</Badge>}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{page.createdAt.toLocaleDateString("de-DE")}</TableCell>
                  <TableCell className="text-muted-foreground">{page.updatedAt.toLocaleDateString("de-DE")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
