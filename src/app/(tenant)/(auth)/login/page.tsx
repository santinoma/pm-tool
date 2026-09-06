import { getTenantContext } from "@/tenant/context";
import LoginPageClient from "./LoginPageClient";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const context = await getTenantContext();
  const ssoConfig = context ? await context.tenantDb.ssoConfig.findFirst({ where: { enabled: true } }) : null;

  return <LoginPageClient ssoEnabled={Boolean(ssoConfig)} initialError={params.error ?? null} />;
}
