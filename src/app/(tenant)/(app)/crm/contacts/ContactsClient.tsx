"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/ui/shadcn/components/button";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/shadcn/components/table";

interface CompanyOption {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  companyId: string;
  companyName: string;
}

export function ContactsClient({ contacts, companies }: { contacts: Contact[]; companies: CompanyOption[] }) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const response = await fetch(`/api/tenant/clients/${companyId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, title: title || undefined, email: email || undefined, phone: phone || undefined }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Kontakt konnte nicht angelegt werden.");
      return;
    }
    setName("");
    setTitle("");
    setEmail("");
    setPhone("");
    router.refresh();
  }

  return (
    <div className="py-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Contacts</h1>
      <p className="mb-6 text-sm text-muted-foreground">Alle Kontakte projektübergreifend.</p>

      {companies.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Neuer Kontakt</h2>
          <form onSubmit={handleSubmit} className="mb-8 flex flex-wrap gap-3">
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Company" /></SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required className="min-w-40 flex-1" />
            <Input placeholder="Titel" value={title} onChange={(event) => setTitle(event.target.value)} className="w-40" />
            <Input placeholder="E-Mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-48" />
            <Input placeholder="Telefon" value={phone} onChange={(event) => setPhone(event.target.value)} className="w-40" />
            <Button type="submit" loading={saving}>
              Anlegen
            </Button>
          </form>
          {error && <p className="mb-6 text-sm text-destructive">{error}</p>}
        </>
      )}

      {contacts.length === 0 ? (
        <div className="rounded-lg border py-14 text-center">
          <h3 className="font-semibold">Noch keine Kontakte</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Titel</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Telefon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-semibold">{contact.name}</TableCell>
                  <TableCell className="text-muted-foreground">{contact.title ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{contact.companyName}</TableCell>
                  <TableCell className="text-muted-foreground">{contact.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{contact.phone ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
