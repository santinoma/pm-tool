import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";

export const dynamic = "force-dynamic";

export default async function Home() {
  const context = await getTenantContext();

  if (!context) {
    redirect("/tenants");
  }

  redirect(context.currentUser ? "/dashboard" : "/login");
}
