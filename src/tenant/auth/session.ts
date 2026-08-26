export const SESSION_COOKIE_NAME = "pmtool_session";
export const SESSION_VALIDITY_DAYS = 7;

export function computeSessionExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + SESSION_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

export interface SessionLike {
  expiresAt: Date;
}

export function isSessionExpired(session: SessionLike, now: Date = new Date()): boolean {
  return session.expiresAt.getTime() < now.getTime();
}

export interface SessionCookieOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  expires: Date;
}

/**
 * Baut die Cookie-Optionen für ein Session-Cookie. Bewusst ohne `domain`-Attribut,
 * damit das Cookie nur für den exakten Host gilt, auf dem es gesetzt wurde
 * (verhindert versehentliche Gültigkeit über mehrere Subdomains hinweg).
 */
export function buildSessionCookie(
  sessionId: string,
  expiresAt: Date,
  options: { secure: boolean } = { secure: process.env.NODE_ENV === "production" },
): SessionCookieOptions {
  return {
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: options.secure,
    path: "/",
    expires: expiresAt,
  };
}

export function buildExpiredSessionCookie(
  options: { secure: boolean } = { secure: process.env.NODE_ENV === "production" },
): SessionCookieOptions {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: options.secure,
    path: "/",
    expires: new Date(0),
  };
}
