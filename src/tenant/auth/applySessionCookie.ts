import type { NextResponse } from "next/server";
import type { SessionCookieOptions } from "./session";

/**
 * Kleiner Next.js-spezifischer Adapter, der die reinen `SessionCookieOptions`
 * (aus session.ts, bewusst framework-frei gehalten) auf eine echte NextResponse anwendet.
 */
export function applySessionCookie(response: NextResponse, cookie: SessionCookieOptions): void {
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    path: cookie.path,
    expires: cookie.expires,
  });
}
