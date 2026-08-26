import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { extractMentionedEmails } from "@/tenant/collaboration/mentions";
import { hasBroadcastMention } from "@/tenant/notifications/broadcast";
import { recordActivity } from "@/tenant/notifications/recordActivity";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const comments = await context.tenantDb.comment.findMany({
    where: { taskId: id },
    include: { author: true, mentions: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ comments });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.body !== "string" || body.body.trim().length === 0) {
    return NextResponse.json({ error: "Kommentartext ist erforderlich." }, { status: 400 });
  }

  const comment = await context.tenantDb.comment.create({
    data: { taskId: id, authorId: context.currentUser.id, body: body.body },
  });

  const mentionedEmails = extractMentionedEmails(body.body);
  let matchedUserIds: string[] = [];
  if (mentionedEmails.length > 0) {
    const matchedUsers = await context.tenantDb.user.findMany({
      where: { email: { in: mentionedEmails } },
    });
    if (matchedUsers.length > 0) {
      await context.tenantDb.mention.createMany({
        data: matchedUsers.map((user) => ({ commentId: comment.id, userId: user.id })),
      });
      matchedUserIds = matchedUsers.map((user) => user.id);
    }
  }

  const task = await context.tenantDb.task.findUnique({
    where: { id },
    select: { title: true, projects: { where: { isPrimary: true }, select: { projectId: true } } },
  });
  const primaryProjectId = task?.projects[0]?.projectId;
  if (primaryProjectId) {
    await recordActivity(context.tenantDb, {
      projectId: primaryProjectId,
      actorId: context.currentUser.id,
      type: "comment_added",
      summary: `Neuer Kommentar auf „${task?.title}“`,
      mentionedUserIds: matchedUserIds,
      isBroadcast: hasBroadcastMention(body.body),
    });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
