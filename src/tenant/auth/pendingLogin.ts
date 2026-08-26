export const PENDING_LOGIN_VALIDITY_MINUTES = 5;

export function computePendingLoginExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + PENDING_LOGIN_VALIDITY_MINUTES * 60 * 1000);
}

export function isPendingLoginValid(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() > now.getTime();
}
