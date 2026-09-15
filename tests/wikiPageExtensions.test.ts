import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import { validateCustomFieldValue } from "../src/tenant/projects/customFieldValue";
import { isSharedWikiLinkValid } from "../src/tenant/sharedWiki/sharedWikiLinkAccess";

let tenant: Tenant;
let projectId: string;
let wikiPageId: string;
let userId: string;

beforeEach(async () => {
  const subdomain = `wikiext-${Date.now()}`;
  await provisionTenant({ name: "Wiki Ext Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const user = await tenantDb.user.create({ data: { email: "user@example.com", role: "admin" } });
  userId = user.id;
  const project = await tenantDb.project.create({ data: { name: "Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
  const page = await tenantDb.wikiPage.create({
    data: { projectId, title: "Onboarding", content: "Welcome" },
  });
  wikiPageId = page.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("wiki page — custom fields", () => {
  it("validates and sets a custom field value on a wiki page", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const field = await tenantDb.customFieldDef.create({
      data: { projectId, entityType: "wiki_page", key: "priority", label: "Priority", type: "select", options: ["low", "high"] },
    });

    const invalid = validateCustomFieldValue("select", "medium", field.options);
    expect(invalid.valid).toBe(false);

    const valid = validateCustomFieldValue("select", "high", field.options);
    expect(valid.valid).toBe(true);

    const value = await tenantDb.wikiPageCustomFieldValue.upsert({
      where: { fieldId_wikiPageId: { fieldId: field.id, wikiPageId } },
      create: { fieldId: field.id, wikiPageId, value: "high" },
      update: { value: "high" },
    });
    expect(value.value).toBe("high");

    const updated = await tenantDb.wikiPageCustomFieldValue.upsert({
      where: { fieldId_wikiPageId: { fieldId: field.id, wikiPageId } },
      create: { fieldId: field.id, wikiPageId, value: "low" },
      update: { value: "low" },
    });
    expect(updated.value).toBe("low");

    const all = await tenantDb.wikiPageCustomFieldValue.findMany({ where: { wikiPageId } });
    expect(all).toHaveLength(1);
  });

  it("only accepts entityType wiki_page for wiki-scoped field defs", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const field = await tenantDb.customFieldDef.create({
      data: { projectId, entityType: "wiki_page", key: "owner-note", label: "Note", type: "text", options: [] },
    });
    const defs = await tenantDb.customFieldDef.findMany({ where: { projectId, entityType: "wiki_page" } });
    expect(defs.map((d) => d.id)).toContain(field.id);
  });
});

describe("wiki page — templates", () => {
  it("sets and reads the isTemplate flag", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    let page = await tenantDb.wikiPage.findUnique({ where: { id: wikiPageId } });
    expect(page?.isTemplate).toBe(false);

    page = await tenantDb.wikiPage.update({ where: { id: wikiPageId }, data: { isTemplate: true } });
    expect(page.isTemplate).toBe(true);

    const templates = await tenantDb.wikiPage.findMany({ where: { projectId, isTemplate: true } });
    expect(templates.map((p) => p.id)).toEqual([wikiPageId]);
  });
});

describe("wiki page — shared links", () => {
  it("resolves anonymously when valid and is rejected when revoked", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const link = await tenantDb.sharedWikiLink.create({
      data: { wikiPageId, token: "wiki-share-token-1", createdById: userId },
    });

    expect(isSharedWikiLinkValid(link).valid).toBe(true);

    const found = await tenantDb.sharedWikiLink.findUnique({
      where: { token: "wiki-share-token-1" },
      include: { wikiPage: true },
    });
    expect(found?.wikiPage.title).toBe("Onboarding");
    expect(isSharedWikiLinkValid(found!).valid).toBe(true);

    const revoked = await tenantDb.sharedWikiLink.update({
      where: { id: link.id },
      data: { revokedAt: new Date() },
    });
    const validation = isSharedWikiLinkValid(revoked);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe("revoked");
  });

  it("returns not-found semantics for an unknown token", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const found = await tenantDb.sharedWikiLink.findUnique({ where: { token: "does-not-exist" } });
    expect(found).toBeNull();
  });
});
