import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { REPORT_DATA_SOURCES, type ReportDataSource } from "@/tenant/reporting/reportQuery";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const reports = await context.tenantDb.savedReport.findMany({
    where: { ownerId: context.currentUser.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { name, category, dataSource, filterConfig, groupByConfig, chartType, projectId } = body as {
    name?: string;
    category?: string | null;
    dataSource?: string;
    filterConfig?: unknown;
    groupByConfig?: unknown;
    chartType?: string | null;
    projectId?: string | null;
  };

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }
  if (!dataSource || !REPORT_DATA_SOURCES.includes(dataSource as ReportDataSource)) {
    return NextResponse.json(
      { error: `dataSource muss eines von ${REPORT_DATA_SOURCES.join(", ")} sein.` },
      { status: 400 },
    );
  }
  if (!Array.isArray(filterConfig)) {
    return NextResponse.json({ error: "filterConfig muss ein Array sein." }, { status: 400 });
  }

  const report = await context.tenantDb.savedReport.create({
    data: {
      name: name.trim(),
      category: typeof category === "string" && category.trim() ? category.trim() : null,
      dataSource,
      filterConfig: filterConfig as object,
      groupByConfig: groupByConfig && typeof groupByConfig === "object" ? (groupByConfig as object) : undefined,
      chartType: typeof chartType === "string" ? chartType : null,
      ownerId: context.currentUser.id,
      projectId: typeof projectId === "string" && projectId.trim() ? projectId : null,
    },
  });
  return NextResponse.json({ report }, { status: 201 });
}
