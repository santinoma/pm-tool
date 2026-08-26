import { randomBytes } from "node:crypto";

const INVITE_TOKEN_BYTES = 32;
export const INVITE_VALIDITY_DAYS = 7;

export function generateInviteToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("hex");
}

export function computeInviteExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

export interface InviteLike {
  expiresAt: Date;
  acceptedAt: Date | null;
}

export interface InviteValidationResult {
  valid: boolean;
  reason?: "expired" | "already-accepted";
}

export function isInviteValid(invite: InviteLike, now: Date = new Date()): InviteValidationResult {
  if (invite.acceptedAt !== null) {
    return { valid: false, reason: "already-accepted" };
  }
  if (invite.expiresAt.getTime() < now.getTime()) {
    return { valid: false, reason: "expired" };
  }
  return { valid: true };
}

export function buildInviteUrl(baseDomain: string, subdomain: string, token: string): string {
  const protocol = baseDomain === "localhost" ? "http" : "https";
  return `${protocol}://${subdomain}.${baseDomain}/accept-invite/${token}`;
}
