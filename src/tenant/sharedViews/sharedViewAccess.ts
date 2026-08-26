export interface SharedViewLike {
  revokedAt: Date | null;
  expiresAt: Date | null;
}

export interface SharedViewValidation {
  valid: boolean;
  reason?: "revoked" | "expired";
}

export function isSharedViewValid(view: SharedViewLike, now: Date = new Date()): SharedViewValidation {
  if (view.revokedAt !== null) {
    return { valid: false, reason: "revoked" };
  }
  if (view.expiresAt !== null && view.expiresAt.getTime() < now.getTime()) {
    return { valid: false, reason: "expired" };
  }
  return { valid: true };
}
