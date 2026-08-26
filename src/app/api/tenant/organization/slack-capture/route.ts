import crypto from "crypto";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const config = await context.tenantDb.slackCaptureConfig.findFirst();
  return NextResponse.json({
    config: config
      ? {
          id: config.id,
          signingSecret: config.signingSecret,
          defaultProjectId: config.defaultProjectId,
          enabled: config.enabled,
        }
      : null,
  });
}

export async function PATCH(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.defaultProjectId !== "string") {
    return NextResponse.json({ error: "defaultProjectId ist erforderlich." }, { status: 400 });
  }

  const existing = await context.tenantDb.slackCaptureConfig.findFirst();
  const config = existing
    ? await context.tenantDb.slackCaptureConfig.update({
        where: { id: existing.id },
        data: {
          defaultProjectId: body.defaultProjectId,
          enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
        },
      })
    : await context.tenantDb.slackCaptureConfig.create({
        data: {
          signingSecret: crypto.randomBytes(24).toString("hex"),
          defaultProjectId: body.defaultProjectId,
          enabled: typeof body.enabled === "boolean" ? body.enabled : false,
        },
      });

  return NextResponse.json({
    config: {
      id: config.id,
      signingSecret: config.signingSecret,
      defaultProjectId: config.defaultProjectId,
      enabled: config.enabled,
    },
  });
}
