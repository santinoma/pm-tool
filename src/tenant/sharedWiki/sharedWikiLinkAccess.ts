export interface SharedWikiLinkLike {
  revokedAt: Date | null;
}

export interface SharedWikiLinkValidation {
  valid: boolean;
  reason?: "revoked";
}

export function isSharedWikiLinkValid(link: SharedWikiLinkLike): SharedWikiLinkValidation {
  if (link.revokedAt !== null) {
    return { valid: false, reason: "revoked" };
  }
  return { valid: true };
}
