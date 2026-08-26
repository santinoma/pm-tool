import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { verifySlackSignature } from "@/tenant/slackCapture/verifySignature";
import { buildTaskDraft } from "@/tenant/slackCapture/buildTaskDraft";
import { resolveInitialTriageState } from "@/tenant/projects/triageState";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Unbekannter Tenant." }, { status: 404 });
  }

  const config = await context.tenantDb.slackCaptureConfig.findFirst();
  if (!config || !config.enabled) {
    return NextResponse.json({ error: "Slack-Capture ist nicht aktiviert." }, { status: 403 });
  }

  const rawBody = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp") ?? "";
  const signature = request.headers.get("x-slack-signature") ?? "";

  if (!verifySlackSignature(config.signingSecret, timestamp, rawBody, signature)) {
    return NextResponse.json({ error: "Ungültige Signatur." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  if (
    typeof payload?.text !== "string" ||
    typeof payload?.userName !== "string" ||
    typeof payload?.channelName !== "string" ||
    typeof payload?.permalink !== "string"
  ) {
    return NextResponse.json(
      { error: "text, userName, channelName und permalink sind erforderlich." },
      { status: 400 },
    );
  }

  const draft = buildTaskDraft({
    text: payload.text,
    userName: payload.userName,
    channelName: payload.channelName,
    permalink: payload.permalink,
  });

  const [defaultStatus, settings] = await Promise.all([
    context.tenantDb.workflowStatus.findFirst({
      where: { projectId: config.defaultProjectId, isDefault: true },
    }),
    getOrCreateTenantSettings(context.tenantDb),
  ]);
  if (!defaultStatus) {
    return NextResponse.json({ error: "Standard-Projekt hat keinen Default-Status." }, { status: 409 });
  }

  const task = await context.tenantDb.task.create({
    data: {
      title: draft.title,
      description: draft.description,
      externalSourceUrl: draft.externalSourceUrl,
      statusId: defaultStatus.id,
      inTriage: resolveInitialTriageState(settings.triageEnabled),
      projects: { create: { projectId: config.defaultProjectId, isPrimary: true } },
    },
  });

  return NextResponse.json({ id: task.id, title: task.title }, { status: 201 });
}
