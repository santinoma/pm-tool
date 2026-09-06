import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import { looksLikePemCertificate, validateSsoConfigInput } from "../src/tenant/sso/ssoConfigValidation";
import { isEligibleForSso, isPasswordLoginAllowed } from "../src/tenant/sso/ssoEligibility";
import { extractSsoEmail } from "../src/tenant/sso/extractSsoEmail";

const VALID_CERT = "-----BEGIN CERTIFICATE-----\nMIIB...fake...\n-----END CERTIFICATE-----";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `sso-${Date.now()}`;
  await provisionTenant({ name: "SSO Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("ssoConfigValidation", () => {
  it("accepts a well-formed PEM certificate", () => {
    expect(looksLikePemCertificate(VALID_CERT)).toBe(true);
  });

  it("rejects a non-PEM cert string", () => {
    expect(looksLikePemCertificate("not-a-cert")).toBe(false);
    expect(looksLikePemCertificate("-----BEGIN PUBLIC KEY-----\nfoo\n-----END PUBLIC KEY-----")).toBe(false);
  });

  it("validates a full, well-formed config input", () => {
    const result = validateSsoConfigInput({
      provider: "okta",
      entryPoint: "https://idp.example.com/sso/saml",
      issuer: "https://idp.example.com/metadata",
      cert: VALID_CERT,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects an input whose cert is not a PEM block", () => {
    const result = validateSsoConfigInput({
      provider: "okta",
      entryPoint: "https://idp.example.com/sso/saml",
      issuer: "https://idp.example.com/metadata",
      cert: "definitely-not-pem",
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/PEM/);
  });

  it("rejects an invalid entryPoint URL", () => {
    const result = validateSsoConfigInput({
      provider: "okta",
      entryPoint: "not a url",
      issuer: "https://idp.example.com/metadata",
      cert: VALID_CERT,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects an unknown provider", () => {
    const result = validateSsoConfigInput({
      provider: "unknown-provider",
      entryPoint: "https://idp.example.com/sso/saml",
      issuer: "https://idp.example.com/metadata",
      cert: VALID_CERT,
    });
    expect(result.valid).toBe(false);
  });
});

describe("SsoConfig upsert via PUT-style route logic", () => {
  it("creates the tenant's single SsoConfig row on first save, rejecting a bad cert first", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    const badInput = validateSsoConfigInput({
      provider: "okta",
      entryPoint: "https://idp.example.com/sso/saml",
      issuer: "https://idp.example.com/metadata",
      cert: "not-pem-at-all",
    });
    expect(badInput.valid).toBe(false);

    const goodInput = validateSsoConfigInput({
      provider: "okta",
      entryPoint: "https://idp.example.com/sso/saml",
      issuer: "https://idp.example.com/metadata",
      cert: VALID_CERT,
    });
    expect(goodInput.valid).toBe(true);

    const created = await tenantDb.ssoConfig.create({
      data: {
        provider: "okta",
        entryPoint: "https://idp.example.com/sso/saml",
        issuer: "https://idp.example.com/metadata",
        cert: VALID_CERT,
      },
    });
    expect(created.enabled).toBe(false);
    expect(created.enforceSso).toBe(false);

    const all = await tenantDb.ssoConfig.findMany();
    expect(all).toHaveLength(1);
  });
});

describe("SSO eligibility — client exclusion", () => {
  it("excludes client-role users from SSO even with a matching email", () => {
    expect(isEligibleForSso({ role: "client" })).toBe(false);
    expect(isEligibleForSso({ role: "member" })).toBe(true);
    expect(isEligibleForSso({ role: "admin" })).toBe(true);
    expect(isEligibleForSso({ role: "owner" })).toBe(true);
  });

  it("would exclude a client-role user looked up by email in the tenant DB", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const client = await tenantDb.user.create({ data: { email: "client@example.com", role: "client" } });
    expect(isEligibleForSso(client)).toBe(false);
  });
});

describe("enforceSso — password login gate", () => {
  it("blocks member/admin/owner password login when enforceSso is true", () => {
    expect(isPasswordLoginAllowed({ role: "member" }, true)).toBe(false);
    expect(isPasswordLoginAllowed({ role: "admin" }, true)).toBe(false);
    expect(isPasswordLoginAllowed({ role: "owner" }, true)).toBe(false);
  });

  it("still allows a client-role user to log in with password when enforceSso is true", () => {
    expect(isPasswordLoginAllowed({ role: "client" }, true)).toBe(true);
  });

  it("allows everyone to use password login when enforceSso is false", () => {
    expect(isPasswordLoginAllowed({ role: "member" }, false)).toBe(true);
    expect(isPasswordLoginAllowed({ role: "client" }, false)).toBe(true);
  });
});

describe("extractSsoEmail", () => {
  it("prefers an email-shaped NameID", () => {
    expect(extractSsoEmail({ nameID: "user@example.com" })).toBe("user@example.com");
  });

  it("falls back to an email attribute when NameID is not an email", () => {
    expect(
      extractSsoEmail({
        nameID: "some-opaque-id",
        attributes: { email: "user@example.com" },
      }),
    ).toBe("user@example.com");
  });

  it("returns null when no email can be determined", () => {
    expect(extractSsoEmail({})).toBe(null);
  });
});
