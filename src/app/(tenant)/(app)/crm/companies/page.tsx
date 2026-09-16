import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { CompaniesClient } from "./CompaniesClient";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const companies = await context.tenantDb.client.findMany({
    orderBy: { name: "asc" },
    include: { accountOwner: { select: { name: true, email: true } } },
  });

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Companies"
    >
      <CompaniesClient
        companies={companies.map((company) => ({
          id: company.id,
          name: company.name,
          type: company.type,
          taxId: company.taxId,
          accountOwnerLabel: company.accountOwner?.name ?? company.accountOwner?.email ?? null,
          paymentTermsDays: company.paymentTermsDays,
          archived: company.archivedAt !== null,
        }))}
      />
    </AppShellNextElite>
  );
}
