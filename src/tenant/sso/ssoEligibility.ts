/**
 * Reine, ungebundene Business-Regeln rund um SSO-Berechtigung — bewusst aus den
 * Route-Handlern herausgezogen, damit sie ohne SAML-Assertion/HTTP-Request
 * getestet werden können (siehe tests/ssoConfig.test.ts).
 *
 * Produktentscheidung: Client-Nutzer melden sich immer per Passwort an, nie
 * über die SSO-Verbindung einer Organisation — auch wenn ihre E-Mail-Adresse
 * zufällig mit einer SAML-Assertion übereinstimmt. Umgekehrt bleibt der
 * Passwort-Login für Clients auch dann erlaubt, wenn ein Tenant SSO für alle
 * übrigen Rollen erzwingt (`enforceSso`).
 */

export interface RoleLike {
  role: string;
}

/** Darf sich dieser Nutzer per SAML-SSO anmelden? Clients sind ausgeschlossen. */
export function isEligibleForSso(user: RoleLike): boolean {
  return user.role !== "client";
}

/**
 * Darf sich dieser Nutzer per Passwort anmelden, gegeben ob der Tenant SSO
 * erzwingt? Symmetrisch zu `isEligibleForSso`: Clients dürfen immer per
 * Passwort, alle anderen Rollen nur, solange `enforceSso` nicht aktiv ist.
 */
export function isPasswordLoginAllowed(user: RoleLike, enforceSso: boolean): boolean {
  if (!enforceSso) {
    return true;
  }
  return !isEligibleForSso(user);
}
