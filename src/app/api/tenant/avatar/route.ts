import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import {
  ALLOWED_AVATAR_MIME_TYPES,
  DEFAULT_AVATAR_PRESETS,
  MAX_AVATAR_SIZE_BYTES,
  buildAvatarStoragePath,
  deleteAvatarFile,
  saveAvatarFile,
} from "@/tenant/profile/avatarStorage";

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Datei ist erforderlich." }, { status: 400 });
  }
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Nur PNG, JPEG, WEBP oder GIF sind erlaubt." }, { status: 400 });
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return NextResponse.json({ error: "Datei ist zu groß (max. 2 MB)." }, { status: 400 });
  }

  const previousStoragePath = context.currentUser.avatarStoragePath;
  const storagePath = buildAvatarStoragePath(context.currentUser.id, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveAvatarFile(storagePath, buffer);

  const updated = await context.tenantDb.user.update({
    where: { id: context.currentUser.id },
    data: {
      avatarStoragePath: storagePath,
      avatarMimeType: file.type,
      avatarUrl: `/api/tenant/avatar/${context.currentUser.id}`,
    },
  });

  if (previousStoragePath) {
    await deleteAvatarFile(previousStoragePath);
  }

  return NextResponse.json({ avatarUrl: updated.avatarUrl });
}

export async function PATCH(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.preset !== "string" || !DEFAULT_AVATAR_PRESETS.includes(body.preset)) {
    return NextResponse.json({ error: `preset muss eines von ${DEFAULT_AVATAR_PRESETS.join(", ")} sein.` }, { status: 400 });
  }

  const previousStoragePath = context.currentUser.avatarStoragePath;
  const updated = await context.tenantDb.user.update({
    where: { id: context.currentUser.id },
    data: {
      avatarUrl: `/avatars/${body.preset}.svg`,
      avatarStoragePath: null,
      avatarMimeType: null,
    },
  });

  if (previousStoragePath) {
    await deleteAvatarFile(previousStoragePath);
  }

  return NextResponse.json({ avatarUrl: updated.avatarUrl });
}
