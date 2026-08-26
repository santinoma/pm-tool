import type { ActivityEventType } from "@/generated/tenant-client/client.js";

export interface IntegrationTemplate {
  key: string;
  name: string;
  description: string;
  category: "notifications" | "automation" | "custom";
  eventTypes: ActivityEventType[];
  urlPlaceholder: string;
}

export const INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    key: "slack-notifications",
    name: "Slack-Benachrichtigungen",
    description: "Sende eine Nachricht in einen Slack-Channel, wenn Tasks erstellt oder erledigt werden.",
    category: "notifications",
    eventTypes: ["task_created", "task_status_changed"],
    urlPlaceholder: "https://hooks.slack.com/services/…",
  },
  {
    key: "zapier",
    name: "Zapier",
    description: "Löse Zaps für alle wichtigen Projekt-Ereignisse aus.",
    category: "automation",
    eventTypes: ["task_created", "task_status_changed", "comment_added"],
    urlPlaceholder: "https://hooks.zapier.com/hooks/catch/…",
  },
  {
    key: "custom-webhook",
    name: "Custom Webhook",
    description: "Eigener Endpunkt für alle Ereignistypen — volle Kontrolle.",
    category: "custom",
    eventTypes: [
      "task_created",
      "task_status_changed",
      "comment_added",
      "attachment_added",
      "wiki_page_created",
      "wiki_page_updated",
    ],
    urlPlaceholder: "https://example.com/webhook",
  },
];

export function findIntegrationTemplate(key: string): IntegrationTemplate | undefined {
  return INTEGRATION_TEMPLATES.find((template) => template.key === key);
}
