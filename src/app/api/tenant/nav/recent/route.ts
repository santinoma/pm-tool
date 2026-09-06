import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

const TAKE = 5;

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const [tasks, docs, projects, meetings, deals, contacts, companies, reports] = await Promise.all([
    context.tenantDb.task.findMany({
      where: { assigneeId: context.currentUser.id, inTriage: false },
      orderBy: { updatedAt: "desc" },
      take: TAKE,
      include: { projects: { where: { isPrimary: true }, select: { projectId: true } } },
    }),
    context.tenantDb.wikiPage.findMany({
      orderBy: { updatedAt: "desc" },
      take: TAKE,
      select: { id: true, title: true, projectId: true },
    }),
    context.tenantDb.project.findMany({
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: { id: true, name: true },
    }),
    context.tenantDb.meeting.findMany({
      orderBy: { scheduledAt: "desc" },
      take: TAKE,
      select: { id: true, title: true },
    }),
    context.tenantDb.deal.findMany({
      orderBy: { createdAt: "desc" },
      take: TAKE,
      include: { company: { select: { name: true } } },
    }),
    context.tenantDb.clientContact.findMany({
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: { id: true, name: true },
    }),
    context.tenantDb.client.findMany({
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: { id: true, name: true },
    }),
    context.tenantDb.savedReport.findMany({
      where: { ownerId: context.currentUser.id },
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: { id: true, name: true },
    }),
  ]);

  return NextResponse.json({
    tasks: tasks
      .filter((task) => task.projects[0]?.projectId)
      .map((task) => ({ href: `/projects/${task.projects[0].projectId}/tasks/${task.id}`, label: task.title })),
    docs: docs.map((doc) => ({ href: `/projects/${doc.projectId}/wiki/${doc.id}`, label: doc.title })),
    projects: projects.map((project) => ({ href: `/projects/${project.id}/list`, label: project.name })),
    meetings: meetings.map((meeting) => ({ href: `/meetings/${meeting.id}`, label: meeting.title })),
    deals: deals.map((deal) => ({ href: "/crm/deals", label: `${deal.company.name} – ${deal.title}` })),
    contacts: contacts.map((contact) => ({ href: "/crm/contacts", label: contact.name })),
    companies: companies.map((company) => ({ href: "/crm/companies", label: company.name })),
    reports: reports.map((report) => ({ href: `/reports/builder?reportId=${report.id}`, label: report.name })),
  });
}
