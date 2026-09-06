import * as samlify from "samlify";

/**
 * Baut die Basis-URL eines Tenants aus dessen Subdomain, nach demselben Muster
 * wie `buildInviteUrl` (`src/tenant/auth/invite.ts`): `http` nur für die lokale
 * `localhost`-Basisdomain, sonst immer `https`.
 */
export function buildTenantBaseUrl(subdomain: string, baseDomain: string): string {
  const protocol = baseDomain === "localhost" ? "http" : "https";
  return `${protocol}://${subdomain}.${baseDomain}`;
}

export function buildSpEntityId(subdomain: string, baseDomain: string): string {
  return `${buildTenantBaseUrl(subdomain, baseDomain)}/api/tenant/sso/metadata`;
}

export function buildAcsUrl(subdomain: string, baseDomain: string): string {
  return `${buildTenantBaseUrl(subdomain, baseDomain)}/api/tenant/sso/acs`;
}

/**
 * Baut eine samlify `ServiceProvider`-Instanz für einen Tenant. Der SP hat
 * bewusst keinen eigenen privaten Schlüssel/kein Signieren ausgehender
 * AuthnRequests konfiguriert (`authnRequestsSigned: false`) — die
 * sicherheitsrelevante Signaturprüfung findet ausschließlich auf der
 * eingehenden Assertion des IdP statt (`wantAssertionsSigned: true`,
 * geprüft mit dem in `SsoConfig.cert` hinterlegten Zertifikat des IdP).
 */
export function buildServiceProvider(subdomain: string, baseDomain: string): samlify.ServiceProviderInstance {
  return samlify.ServiceProvider({
    entityID: buildSpEntityId(subdomain, baseDomain),
    assertionConsumerService: [
      {
        Binding: samlify.Constants.namespace.binding.post,
        Location: buildAcsUrl(subdomain, baseDomain),
      },
    ],
    wantAssertionsSigned: true,
  });
}

/**
 * Baut die zugehörige samlify `IdentityProvider`-Instanz aus der gespeicherten
 * `SsoConfig` eines Tenants.
 */
export function buildIdentityProvider(config: {
  entryPoint: string;
  issuer: string;
  cert: string;
}): samlify.IdentityProviderInstance {
  return samlify.IdentityProvider({
    entityID: config.issuer,
    singleSignOnService: [
      {
        Binding: samlify.Constants.namespace.binding.redirect,
        Location: config.entryPoint,
      },
    ],
    signingCert: config.cert,
  });
}

export function resolveBaseDomain(): string {
  return process.env.BASE_DOMAIN ?? "localhost";
}
