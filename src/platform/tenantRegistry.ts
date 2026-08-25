import { platformDb } from "./db";
import type { Tenant, TenantStatus } from "../generated/platform-client/client.js";

export type { Tenant, TenantStatus };

export function listTenants(): Promise<Tenant[]> {
  return platformDb.tenant.findMany({ orderBy: { createdAt: "desc" } });
}

export function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  return platformDb.tenant.findUnique({ where: { subdomain } });
}

export interface CreateTenantRecordInput {
  name: string;
  subdomain: string;
  dbUrl: string;
  status?: TenantStatus;
}

export function createTenantRecord(input: CreateTenantRecordInput): Promise<Tenant> {
  return platformDb.tenant.create({
    data: {
      name: input.name,
      subdomain: input.subdomain,
      dbUrl: input.dbUrl,
      status: input.status ?? "provisioning",
    },
  });
}

export function updateTenantStatus(id: string, status: TenantStatus): Promise<Tenant> {
  return platformDb.tenant.update({ where: { id }, data: { status } });
}
