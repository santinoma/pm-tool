import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { ContactsClient } from "./ContactsClient";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [contacts, companies] = await Promise.all([
    context.tenantDb.clientContact.findMany({
      orderBy: { name: "asc" },
      include: { client: { select: { id: true, name: true } } },
    }),
    context.tenantDb.client.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Contacts"
    >
      <ContactsClient
        companies={companies}
        contacts={contacts.map((contact) => ({
          id: contact.id,
          name: contact.name,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          companyId: contact.clientId,
          companyName: contact.client.name,
        }))}
      />
    </AppShellNextElite>
  );
}
