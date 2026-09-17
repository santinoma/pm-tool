import { platformDb } from "./db";
import type { Tenant, TenantStatus, TenantTier, TenantPlan } from "../generated/platform-client/client.js";

export type { Tenant, TenantStatus, TenantTier, TenantPlan };

export function listTenants(): Promise<Tenant[]> {
  return platformDb.tenant.findMany({ orderBy: { createdAt: "desc" } });
}

export function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  return platformDb.tenant.findUnique({ where: { subdomain } });
}

export function getTenantById(id: string): Promise<Tenant | null> {
  return platformDb.tenant.findUnique({ where: { id } });
}

export interface CreateTenantRecordInput {
  name: string;
  subdomain: string;
  dbUrl: string;
  status?: TenantStatus;
  tier?: TenantTier;
  plan?: TenantPlan;
  addOnFeatures?: string[];
  seatLimit?: number | null;
}

export function createTenantRecord(input: CreateTenantRecordInput): Promise<Tenant> {
  return platformDb.tenant.create({
    data: {
      name: input.name,
      subdomain: input.subdomain,
      dbUrl: input.dbUrl,
      status: input.status ?? "provisioning",
      tier: input.tier ?? "shared",
      plan: input.plan ?? "small",
      addOnFeatures: input.addOnFeatures ?? [],
      seatLimit: input.seatLimit ?? null,
    },
  });
}

export function updateTenantStatus(id: string, status: TenantStatus): Promise<Tenant> {
  return platformDb.tenant.update({ where: { id }, data: { status } });
}

export function updateTenantSeatLimit(id: string, seatLimit: number | null): Promise<Tenant> {
  return platformDb.tenant.update({ where: { id }, data: { seatLimit } });
}

export function deleteTenantRecord(id: string): Promise<Tenant> {
  return platformDb.tenant.delete({ where: { id } });
}
