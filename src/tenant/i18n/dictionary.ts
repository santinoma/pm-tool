export type Locale = "de" | "en";

// Flat key -> {de, en} string table. Add a key here, then call t(locale, "key")
// anywhere (server or client component) instead of hardcoding German text.
const STRINGS = {
  // Nav — top-level groups
  "nav.home": { de: "Home", en: "Home" },
  "nav.projectManagement": { de: "Projektmanagement", en: "Project management" },
  "nav.time": { de: "Zeit", en: "Time" },
  "nav.financials": { de: "Finanzen", en: "Financials" },
  "nav.resourcing": { de: "Ressourcen", en: "Resourcing" },
  "nav.crm": { de: "CRM", en: "CRM" },
  "nav.reports": { de: "Report", en: "Reports" },
  "nav.more": { de: "Mehr", en: "More" },
  "nav.portfolios": { de: "Portfolios", en: "Portfolios" },
  // Nav — Resourcing sub-items
  "nav.resourcePlanner": { de: "Ressourcenplaner", en: "Resource planner" },
  "nav.employees": { de: "Mitarbeiter", en: "Employees" },
  "nav.orgChart": { de: "Org-Chart", en: "Org chart" },
  // Nav — account/search/favorites chrome
  "nav.search": { de: "Suchen (⌘K)", en: "Search (⌘K)" },
  "nav.favorites": { de: "Favoriten", en: "Favorites" },
  "nav.noFavoritesYet": { de: "Noch keine Favoriten", en: "No favorites yet" },
  "nav.members": { de: "Mitglieder", en: "Members" },
  "nav.notifications": { de: "Benachrichtigungen", en: "Notifications" },
  "nav.settings": { de: "Einstellungen", en: "Settings" },
  "nav.logout": { de: "Abmelden", en: "Log out" },
  "nav.openNavigation": { de: "Navigation öffnen", en: "Open navigation" },
  "nav.accountMenu": { de: "Konto-Menü", en: "Account menu" },
  "nav.myTime": { de: "Meine Zeit", en: "My time" },
  "nav.bookAbsence": { de: "Abwesenheit buchen", en: "Book absence" },
  "nav.companyTime": { de: "Unternehmenszeit", en: "Company time" },
  "nav.reportsOverdue": { de: "Überfällig", en: "Overdue" },
  "nav.reportsProgress": { de: "Fortschritt", en: "Progress" },
  "nav.reportsBuilder": { de: "Berichte erstellen", en: "Create report" },
  "nav.nothingRecent": { de: "Nichts Aktuelles.", en: "Nothing recent." },

  // Nav — Projektmanagement sub-items + recent panels
  "nav.tasks": { de: "Tasks", en: "Tasks" },
  "nav.docs": { de: "Docs", en: "Docs" },
  "nav.projects": { de: "Projekte", en: "Projects" },
  "nav.meetings": { de: "Meetings", en: "Meetings" },
  "nav.recentTasks": { de: "Zuletzt bearbeitete Tasks", en: "Recently edited tasks" },
  "nav.recentDocs": { de: "Zuletzt bearbeitete Docs", en: "Recently edited docs" },
  "nav.recentProjects": { de: "Neueste Projekte", en: "Newest projects" },
  "nav.recentMeetings": { de: "Anstehende Meetings", en: "Upcoming meetings" },
  "nav.showAllTasks": { de: "Alle Tasks anzeigen", en: "Show all tasks" },
  "nav.showAllDocs": { de: "Alle Docs anzeigen", en: "Show all docs" },
  "nav.showAllProjects": { de: "Alle Projekte anzeigen", en: "Show all projects" },
  "nav.showAllMeetings": { de: "Alle Meetings anzeigen", en: "Show all meetings" },

  // Nav — Finanzen sub-items + recent panels
  "nav.budgets": { de: "Budgets", en: "Budgets" },
  "nav.expenses": { de: "Ausgaben", en: "Expenses" },
  "nav.invoices": { de: "Rechnungen", en: "Invoices" },
  "nav.purchaseOrders": { de: "Bestellungen", en: "Purchase orders" },
  "nav.payments": { de: "Zahlungen", en: "Payments" },
  "nav.recentBudgets": { de: "Zuletzt bearbeitete Budgets", en: "Recently edited budgets" },
  "nav.recentExpenses": { de: "Zuletzt erfasste Ausgaben", en: "Recently logged expenses" },
  "nav.recentInvoices": { de: "Zuletzt erstellte Rechnungen", en: "Recently created invoices" },
  "nav.recentPurchaseOrders": { de: "Zuletzt erstellte Bestellungen", en: "Recently created purchase orders" },
  "nav.recentPayments": { de: "Zuletzt erfasste Zahlungen", en: "Recently logged payments" },
  "nav.showAllBudgets": { de: "Alle Budgets anzeigen", en: "Show all budgets" },
  "nav.showAllExpenses": { de: "Alle Ausgaben anzeigen", en: "Show all expenses" },
  "nav.showAllInvoices": { de: "Alle Rechnungen anzeigen", en: "Show all invoices" },
  "nav.showAllPurchaseOrders": { de: "Alle Bestellungen anzeigen", en: "Show all purchase orders" },
  "nav.showAllPayments": { de: "Alle Zahlungen anzeigen", en: "Show all payments" },

  // Nav — CRM sub-items + recent panels
  "nav.deals": { de: "Deals", en: "Deals" },
  "nav.contacts": { de: "Contacts", en: "Contacts" },
  "nav.companies": { de: "Companies", en: "Companies" },
  "nav.recentDeals": { de: "Zuletzt erstellte Deals", en: "Recently created deals" },
  "nav.recentContacts": { de: "Zuletzt erstellte Kontakte", en: "Recently created contacts" },
  "nav.recentCompanies": { de: "Zuletzt erstellte Companies", en: "Recently created companies" },
  "nav.showAllDeals": { de: "Alle Deals anzeigen", en: "Show all deals" },
  "nav.showAllContacts": { de: "Alle Kontakte anzeigen", en: "Show all contacts" },
  "nav.showAllCompanies": { de: "Alle Companies anzeigen", en: "Show all companies" },

  // Nav — Reports sub-item + recent panel
  "nav.reportsItem": { de: "Reports", en: "Reports" },
  "nav.recentReports": { de: "Zuletzt gespeicherte Berichte", en: "Recently saved reports" },
  "nav.showAllReports": { de: "Alle Berichte anzeigen", en: "Show all reports" },

  // Dashboard
  "dashboard.addWidget": { de: "Widget hinzufügen", en: "Add widget" },
  "dashboard.newDashboard": { de: "Neues Dashboard", en: "New dashboard" },
  "dashboard.name": { de: "Name", en: "Name" },
  "dashboard.create": { de: "Erstellen", en: "Create" },
  "dashboard.noWidgetsTitle": { de: "Noch keine Widgets", en: "No widgets yet" },
  "dashboard.noWidgetsDesc": {
    de: "Füge über „Widget hinzufügen\" dein erstes Widget hinzu.",
    en: "Add your first widget using \"Add widget\".",
  },
  "dashboard.rename": { de: "Umbenennen", en: "Rename" },
  "dashboard.widen": { de: "Breiter anzeigen", en: "Show wider" },
  "dashboard.narrow": { de: "Schmaler anzeigen", en: "Show narrower" },
  "dashboard.remove": { de: "Entfernen", en: "Remove" },
  "dashboard.filterByProject": { de: "Nach Projekt filtern", en: "Filter by project" },
  "dashboard.allProjects": { de: "Alle Projekte", en: "All projects" },
  "dashboard.deleteDashboardConfirm": {
    de: "wirklich löschen?",
    en: "really delete?",
  },
  "widget.overdue_tasks": { de: "Überfällige Tasks", en: "Overdue tasks" },
  "widget.my_tasks": { de: "Meine Tasks", en: "My tasks" },
  "widget.project_progress": { de: "Projekt-Fortschritt", en: "Project progress" },
  "widget.my_utilization": { de: "Meine Auslastung diese Woche", en: "My utilization this week" },
  "widget.budget_status": { de: "Budget-Status", en: "Budget status" },
  "widget.out_of_office": { de: "Out of office diesen Monat", en: "Out of office this month" },
  "widget.activity_feed": { de: "Feed", en: "Feed" },
  "widget.time_spent_monthly": { de: "Meine monatliche Zeit", en: "My monthly time spent" },
  "widget.time_spent_yearly": { de: "Meine jährliche Zeit", en: "My yearly time spent" },
  "widget.forecast_fulfillment": { de: "Forecast-Erfüllung", en: "Fulfillment of forecast" },
  "widget.noOverdueTasks": { de: "Keine überfälligen Tasks.", en: "No overdue tasks." },
  "widget.noOpenTasks": { de: "Keine offenen Tasks.", en: "No open tasks." },
  "widget.noProjectsYet": { de: "Noch keine Projekte.", en: "No projects yet." },
  "widget.noBudgetProjects": { de: "Keine Projekte mit Budget.", en: "No projects with a budget." },
  "widget.noOneAway": { de: "Niemand abwesend diesen Monat.", en: "No one is away this month." },
  "widget.noActivityYet": { de: "Noch keine Aktivität.", en: "No activity yet." },
  "widget.noTimeEntries": { de: "Keine Zeiteinträge in diesem Zeitraum.", en: "No time entries in this period." },
  "widget.noBookingsThisWeek": { de: "Keine Ressourcenbuchungen diese Woche.", en: "No resource bookings this week." },
  "widget.thisWeek": { de: "Diese Woche", en: "This week" },

  // Settings hub
  "settings.title": { de: "Einstellungen", en: "Settings" },
  "settings.group.myProfile": { de: "Mein Profil", en: "My profile" },
  "settings.group.organization": { de: "Organisation", en: "Organization" },
  "settings.group.modulesAutomation": { de: "Module & Automatisierung", en: "Modules & automation" },
  "settings.group.securityAccess": { de: "Sicherheit & Zugriff", en: "Security & access" },
  "settings.group.users": { de: "Nutzer", en: "Users" },

  "settings.account.title": { de: "Account", en: "Account" },
  "settings.account.desc": { de: "Bearbeite deine Kontoinformationen und Sprache.", en: "Edit your account information and language." },
  "settings.notifications.title": { de: "Benachrichtigungen", en: "Notifications" },
  "settings.notifications.desc": { de: "Passe an, welche Benachrichtigungen du erhältst.", en: "Choose which notifications you receive." },
  "settings.security.title": { de: "Sicherheit", en: "Security" },
  "settings.security.desc": { de: "Passwort ändern, Aktivitäten und Sitzungen verwalten.", en: "Change your password, manage activity and sessions." },
  "settings.appearance.title": { de: "Erscheinungsbild", en: "Appearance" },
  "settings.appearance.desc": { de: "Passe das Erscheinungsbild deines Workspaces an.", en: "Customize the appearance of your workspace." },

  "settings.orgGeneral.title": { de: "Allgemein", en: "General" },
  "settings.orgGeneral.desc": { de: "Währung, Triage und weitere Grundeinstellungen.", en: "Currency, triage, and other basic settings." },
  "settings.clients.title": { de: "Kunden", en: "Clients" },
  "settings.clients.desc": { de: "Firmen verwalten, für die Projekte angelegt werden.", en: "Manage the companies you create projects for." },
  "settings.timeTracking.title": { de: "Zeiterfassung", en: "Time tracking" },
  "settings.timeTracking.desc": { de: "Zeituhr oder Zeiteintragungen konfigurieren.", en: "Configure the timer or manual time entries." },
  "settings.serviceTypes.title": { de: "Leistungstypen", en: "Service types" },
  "settings.serviceTypes.desc": { de: "Verwalte Leistungstypen, die dein Unternehmen anbietet.", en: "Manage the service types your company offers." },
  "settings.rateCards.title": { de: "Rate Cards", en: "Rate cards" },
  "settings.rateCards.desc": { de: "Wiederverwendbare Service-Vorlagen für Budgets.", en: "Reusable service templates for budgets." },
  "settings.holidayCalendars.title": { de: "Feiertagskalender", en: "Holiday calendars" },
  "settings.holidayCalendars.desc": { de: "Feiertagskalender anlegen und Mitgliedern zuweisen.", en: "Create holiday calendars and assign them to members." },
  "settings.recycleBin.title": { de: "Papierkorb", en: "Recycle bin" },
  "settings.recycleBin.desc": { de: "Finde und stelle gelöschte Elemente wieder her.", en: "Find and restore deleted items." },

  "settings.modules.title": { de: "Module", en: "Modules" },
  "settings.modules.desc": { de: "CRM, Reports und Resourcing organisationsweit aktivieren oder deaktivieren.", en: "Enable or disable CRM, Reports and Resourcing organization-wide." },
  "settings.workflows.title": { de: "Workflows", en: "Workflows" },
  "settings.workflows.desc": { de: "Erstelle und bearbeite Gruppen von Task-Status.", en: "Create and edit groups of task statuses." },
  "settings.automations.title": { de: "Automatisierungen", en: "Automations" },
  "settings.automations.desc": { de: "Erstelle Automationen für Updates, Benachrichtigungen oder Zuweisungen.", en: "Create automations for updates, notifications, or assignments." },
  "settings.webhooks.title": { de: "Webhooks", en: "Webhooks" },
  "settings.webhooks.desc": { de: "Externe Systeme über Ereignisse benachrichtigen.", en: "Notify external systems about events." },
  "settings.integrations.title": { de: "Integrationen", en: "Integrations" },
  "settings.integrations.desc": { de: "Vordefinierte Integrationen installieren (Slack, Zapier, Custom Webhook).", en: "Install pre-built integrations (Slack, Zapier, custom webhook)." },
  "settings.apiDocs.title": { de: "API-Dokumentation", en: "API docs" },
  "settings.apiDocs.desc": { de: "Endpunkte und Authentifizierung für die API nachschlagen.", en: "Look up endpoints and authentication for the API." },

  "settings.roles.title": { de: "Rollen & Rechte", en: "Roles & permissions" },
  "settings.roles.desc": { de: "Eigene Rollen mit granularen Berechtigungen anlegen.", en: "Create custom roles with granular permissions." },
  "settings.sso.title": { de: "Single Sign-On", en: "Single sign-on" },
  "settings.sso.desc": { de: "SAML-SSO mit eurem Identity Provider verbinden.", en: "Connect SAML SSO with your identity provider." },
  "settings.auditLog.title": { de: "Audit-Log", en: "Audit log" },
  "settings.auditLog.desc": { de: "Sicherheitsrelevante Aktionen in der Organisation nachvollziehen.", en: "Trace security-relevant actions across the organization." },

  "settings.membersLink.title": { de: "Mitglieder", en: "Members" },
  "settings.membersLink.desc": { de: "Verwalte Nutzer oder lade neue ein.", en: "Manage users or invite new ones." },
  "settings.employeeFields.title": { de: "Personaldaten-Felder", en: "Employee fields" },
  "settings.employeeFields.desc": { de: "Richte eure Personaldaten-Felder ein.", en: "Set up your employee data fields." },

  "settings.account.language": { de: "Sprache", en: "Language" },
  "settings.account.languageHint": {
    de: "Gilt nur für dich. Ändert die Sprache der gesamten Oberfläche.",
    en: "Applies only to you. Changes the language of the whole interface.",
  },
} as const;

export type TranslationKey = keyof typeof STRINGS;

export function t(locale: Locale | null | undefined, key: TranslationKey): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[locale === "en" ? "en" : "de"];
}

const WIDGET_LABEL_KEYS: Record<string, TranslationKey> = {
  overdue_tasks: "widget.overdue_tasks",
  my_tasks: "widget.my_tasks",
  project_progress: "widget.project_progress",
  my_utilization: "widget.my_utilization",
  budget_status: "widget.budget_status",
  out_of_office: "widget.out_of_office",
  activity_feed: "widget.activity_feed",
  time_spent_monthly: "widget.time_spent_monthly",
  time_spent_yearly: "widget.time_spent_yearly",
  forecast_fulfillment: "widget.forecast_fulfillment",
};

export function widgetLabel(locale: Locale | null | undefined, widgetType: string): string {
  const key = WIDGET_LABEL_KEYS[widgetType];
  return key ? t(locale, key) : widgetType;
}
