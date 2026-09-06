import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext } from "@/tenant/context";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";

export const dynamic = "force-dynamic";

function Endpoint({
  method,
  path,
  title,
  description,
  params,
  scopeNote,
  request,
  response,
}: {
  method: string;
  path: string;
  title: string;
  description: string;
  params?: string[];
  scopeNote?: string;
  request?: string;
  response: string;
}) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 font-semibold">
        <span className="font-mono">{method}</span> <span className="font-mono">{path}</span> — {title}
      </h3>
      <p className="mb-2 text-sm text-muted-foreground">{description}</p>
      {params && params.length > 0 && (
        <>
          <p className="mb-1 text-sm">
            <strong>Parameter:</strong>
          </p>
          <ul className="mb-2 list-inside list-disc text-sm">
            {params.map((param) => (
              <li key={param}>{param}</li>
            ))}
          </ul>
        </>
      )}
      {scopeNote && <p className="mb-2 text-sm text-muted-foreground">{scopeNote}</p>}
      {request && (
        <>
          <p className="mb-1 text-sm">
            <strong>Beispiel-Request:</strong>
          </p>
          <code className="block overflow-x-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">{request}</code>
        </>
      )}
      <p className="mt-2 mb-1 text-sm">
        <strong>Beispiel-Response:</strong>
      </p>
      <code className="block overflow-x-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">{response}</code>
    </section>
  );
}

export default async function ApiDocsPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="API-Dokumentation"
    >
      <div className="mx-auto max-w-3xl pb-10">
        <h2 className="mb-3 text-lg font-semibold">API-Dokumentation</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Öffentliche REST-API für Integrationen. Keys werden unter{" "}
          <Link href="/settings/security" className="text-primary hover:underline">
            Sicherheit → API-Keys
          </Link>{" "}
          erstellt und verwaltet.
        </p>

        <section className="mb-5">
          <h3 className="mb-2 font-semibold">Basis-URL</h3>
          <code className="block overflow-x-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
            {"https://{ihre-subdomain}.{BASIS-DOMAIN}/api/v1/..."}
          </code>
          <p className="mt-2 text-sm text-muted-foreground">
            Der Tenant wird automatisch aus dem Hostnamen der Anfrage aufgelöst — es ist kein zusätzlicher
            Tenant-Parameter nötig, solange die Anfrage an die Subdomain Ihrer Organisation geht.
          </p>
        </section>

        <section className="mb-5">
          <h3 className="mb-2 font-semibold">Authentifizierung</h3>
          <p className="mb-2 text-sm">
            Jede Anfrage muss den API-Key als Bearer-Token im <code className="font-mono">Authorization</code>-Header
            mitschicken:
          </p>
          <code className="block overflow-x-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
            {"Authorization: Bearer pmtool_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
          </code>
          <p className="mt-2 text-sm text-muted-foreground">
            Der volle Token wird nur einmal bei der Erstellung angezeigt. Fehlt der Header, ist er ungültig oder
            wurde der Key widerrufen, antwortet die API mit <code className="font-mono">401 Nicht autorisiert.</code>
          </p>
        </section>

        <section className="mb-5">
          <h3 className="mb-2 font-semibold">Berechtigungen (Scope)</h3>
          <p className="mb-2 text-sm">Jeder API-Key hat einen Scope, der beim Erstellen gewählt wird:</p>
          <ul className="mb-2 list-inside list-disc text-sm">
            <li>
              <strong>Nur lesen</strong> (<code className="font-mono">read_only</code>) — nur GET-Anfragen sind erlaubt.
            </li>
            <li>
              <strong>Lesen und Schreiben</strong> (<code className="font-mono">read_write</code>, Standard) — GET,
              POST, PATCH, PUT und DELETE sind erlaubt, sofern der jeweilige Endpunkt sie unterstützt.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Ein <code className="font-mono">read_only</code>-Key, der eine schreibende Anfrage stellt, erhält{" "}
            <code className="font-mono">403</code> mit{" "}
            <code className="font-mono">{'{ "error": "Dieser API-Key ist nur lesend." }'}</code>.
          </p>
        </section>

        <section className="mb-5">
          <h3 className="mb-2 font-semibold">Rate-Limit</h3>
          <p className="text-sm">
            Jeder API-Key ist auf <strong>100 Anfragen pro 10 Sekunden</strong> begrenzt (Fixed-Window, pro Key). Wird
            das Limit überschritten, antwortet die API mit <code className="font-mono">429</code> und einem{" "}
            <code className="font-mono">Retry-After</code>-Header (Sekunden bis zum nächsten Fenster).
          </p>
        </section>

        <h3 className="mb-3 font-semibold">Endpunkte</h3>

        <Endpoint
          method="GET"
          path="/api/v1/projects"
          title="Projekte auflisten"
          description="Alle Projekte des Tenants, alphabetisch sortiert."
          response={`{
  "projects": [
    { "id": "proj_123", "name": "Website Relaunch", "description": "Q3 Relaunch" }
  ]
}`}
        />

        <Endpoint
          method="GET"
          path="/api/v1/tasks"
          title="Tasks auflisten"
          description="Bis zu 100 Tasks, neueste zuerst."
          params={["projectId (optional) — nur Tasks dieses Projekts"]}
          response={`{
  "tasks": [
    { "id": "task_456", "title": "Homepage-Layout", "status": "In Arbeit", "assignee": "anna@example.com" }
  ]
}`}
        />
        <Endpoint
          method="POST"
          path="/api/v1/tasks"
          title="Task anlegen"
          description="Legt einen Task im Default-Status des Projekts an."
          scopeNote="Erfordert einen read_write-Key."
          request={`{
  "title": "Neuer Task",
  "projectId": "proj_123"
}`}
          response={`{
  "id": "task_789",
  "title": "Neuer Task"
}`}
        />

        <Endpoint
          method="GET"
          path="/api/v1/budgets"
          title="Budgets auflisten"
          description="Budgets eines Projekts. In v1 nur lesend — es gibt (noch) keinen POST/PATCH-Endpunkt für Budgets, auch nicht mit einem read_write-Key."
          params={["projectId (erforderlich)"]}
          response={`{
  "budgets": [
    {
      "id": "budget_321",
      "title": "Retainer Q3",
      "projectId": "proj_123",
      "owner": "anna@example.com",
      "isRetainer": true,
      "startDate": "2026-07-01T00:00:00.000Z",
      "endDate": "2026-09-30T00:00:00.000Z",
      "deliveredAt": null
    }
  ]
}`}
        />

        <Endpoint
          method="GET"
          path="/api/v1/time-entries"
          title="Zeiteinträge auflisten"
          description="Bis zu 100 Zeiteinträge, neueste zuerst."
          params={["projectId (optional)", "userId (optional)"]}
          response={`{
  "entries": [
    {
      "id": "entry_111",
      "userId": "user_1",
      "taskId": "task_456",
      "taskTitle": "Homepage-Layout",
      "projectId": "proj_123",
      "projectName": "Website Relaunch",
      "durationMinutes": 90,
      "description": "Layout-Review",
      "createdAt": "2026-08-20T10:00:00.000Z"
    }
  ]
}`}
        />
        <Endpoint
          method="POST"
          path="/api/v1/time-entries"
          title="Zeiteintrag anlegen"
          description="Legt einen Zeiteintrag an. Der Eintrag wird immer dem Nutzer zugeordnet, dem der API-Key gehört."
          scopeNote="Erfordert einen read_write-Key. projectId oder taskId ist erforderlich."
          params={["projectId (projectId oder taskId erforderlich)", "taskId (projectId oder taskId erforderlich)", "durationMinutes (erforderlich, Minuten)", "description (optional)"]}
          request={`{
  "projectId": "proj_123",
  "durationMinutes": 45,
  "description": "Kick-off Call"
}`}
          response={`{
  "id": "entry_222",
  "userId": "user_1",
  "taskId": null,
  "projectId": "proj_123",
  "durationMinutes": 45,
  "description": "Kick-off Call"
}`}
        />
      </div>
    </AppShellNextElite>
  );
}
