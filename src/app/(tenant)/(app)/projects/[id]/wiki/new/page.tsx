import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { NewWikiPageClient } from "./NewWikiPageClient";

export const dynamic = "force-dynamic";

export default async function NewWikiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  return <NewWikiPageClient projectId={id} />;
}
