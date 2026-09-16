import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { resolveInitialTimeEntryState } from "../src/tenant/timeTracking/entryLifecycle";
import { getOrCreateTenantSettings } from "../src/tenant/timeTracking/tenantSettings";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `entrylifecycle-${Date.now()}`;
  await provisionTenant({ name: "Entry Lifecycle Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("resolveInitialTimeEntryState", () => {
  it("auto-submits into the approval queue by default (Time Approval on, Submission off)", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const state = await resolveInitialTimeEntryState(tenantDb);
    expect(state.submittedAt).not.toBeNull();
    expect(state.approvalStatus).toBe("pending");
    expect(state.approvedAt).toBeNull();
  });

  it("starts entries as an unsubmitted Draft when Time Entry Submission is explicitly enabled", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const settings = await getOrCreateTenantSettings(tenantDb);
    await tenantDb.tenantSettings.update({ where: { id: settings.id }, data: { timeEntrySubmissionEnabled: true } });

    const state = await resolveInitialTimeEntryState(tenantDb);
    expect(state.submittedAt).toBeNull();
    expect(state.approvalStatus).toBe("pending");
  });

  it("auto-approves entries immediately when Time Approval is disabled entirely", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const settings = await getOrCreateTenantSettings(tenantDb);
    await tenantDb.tenantSettings.update({ where: { id: settings.id }, data: { timeApprovalEnabled: false } });

    const state = await resolveInitialTimeEntryState(tenantDb);
    expect(state.submittedAt).not.toBeNull();
    expect(state.approvalStatus).toBe("approved");
    expect(state.approvedAt).not.toBeNull();
  });

  it("disabling Time Approval overrides Submission being enabled — still auto-approves", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const settings = await getOrCreateTenantSettings(tenantDb);
    await tenantDb.tenantSettings.update({
      where: { id: settings.id },
      data: { timeApprovalEnabled: false, timeEntrySubmissionEnabled: true },
    });

    const state = await resolveInitialTimeEntryState(tenantDb);
    expect(state.approvalStatus).toBe("approved");
  });
});
