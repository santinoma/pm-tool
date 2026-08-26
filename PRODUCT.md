# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary users are small-to-medium software/professional-services teams (from ~5-person teams up to ~50+ person organizations) who run their project delivery, time tracking, and light budgeting/reporting through the tool day-to-day. Two distinct roles use it differently:
- **Team members / contributors**: manage their own tasks, log time, comment, check notifications, answer check-ins.
- **Owners/admins**: configure projects, workflows, budgets, members, roles, notifications, webhooks, and (at the platform level) provision and manage customer tenants.

No bias toward either team size in the UI's first impression — both audiences are equally important; the interface must feel equally at home for a 5-person team and a 50-person org.

## Product Purpose
A project-management SaaS positioned as "better and clearer" than incumbents like Productive.io, OpenProject, and Slack for PM workflows — full project/task management, time tracking, budgeting, resource planning, collaboration (comments/mentions/wiki/attachments), notifications, reporting dashboards, and admin/webhooks/check-ins, delivered as one coherent product instead of a patchwork of tools.

## Positioning
Where competitors like Jira, Wrike, and Smartsheet win on power but lose on clarity (everything configurable before you can start), this product follows Linear's approach: opinionated defaults, minimal chrome, a fast/keyboard-first feel (Cmd+K command palette as primary navigation), and sensible behavior from day one rather than a maze of setup screens.

## Operating Context
Two structurally distinct surfaces, each its own audience and its own screens:
1. **Platform-admin surface** (no tenant context, accessed at the base/admin domain) — used internally to provision and manage customer tenants (create tenant, view tenant list/status).
2. **Tenant app surface** (accessed per-customer subdomain, e.g. `acme.example.com`) — the actual product customers use daily: login, dashboard (personal widget home), projects (list/board/calendar/Gantt/hill-chart/triage views), tasks with comments/attachments/dependencies/custom fields, time tracking, budgeting, resource planning, wiki, notifications inbox, activity feed, check-ins, and settings (organization, members/roles, time-tracking policy, webhooks).

Each tenant has its own isolated database; the same Next.js app serves all tenants, resolving which one via subdomain on every request.

## Capabilities and Constraints
- Full backend (Next.js App Router route handlers, Prisma, PostgreSQL) is already implemented and tested for every module listed above (see `CAPABILITY-MAP.md`) — this work is UI-only, wiring existing server-loaded data into real interface.
- Multi-tenant, database-per-tenant architecture; the DB boundary is the org boundary.
- Role model is a fixed three-tier enum (`owner`/`admin`/`member`) — no custom/configurable permissions in v1.
- No native mobile platform — web only, responsive is a plus but desktop/laptop usage is primary (this is a work tool used at a desk).
- No design system currently exists: every existing page uses ad hoc inline styles with no shared tokens, type scale, or component library.

## Brand Commitments
No product name has been chosen yet — use a neutral placeholder in UI copy (e.g. a wordmark stand-in) rather than inventing a real brand name. No existing logo, color, or voice commitments.

## Evidence on Hand
No real customer data, testimonials, or case studies exist. Do not fabricate any. Sample/seed data used for building and reviewing UI must be clearly fictional (e.g. generic project/task names), not styled as real customer proof.

## Product Principles
- Opinionated over configurable: ship sensible defaults; only expose configuration where the backend already models it as a real setting (workflows, custom fields, notification levels).
- Fast and keyboard-first: navigation and common actions should not require reaching for the mouse (Cmd+K palette is a primary navigation path, not a bonus feature).
- One coherent product, not a shell around many tools: the two surfaces (platform-admin, tenant app) should feel like siblings from the same design family, not unrelated products.
- Clarity beats density: prefer fewer, well-hierarchized elements per screen over cramming in everything the data model supports.

## Accessibility & Inclusion
No specific accessibility standard has been mandated by the user. Build with ordinary web accessibility hygiene (semantic HTML, sufficient contrast, keyboard operability) since this is a professional daily-use tool, but no formal WCAG level was confirmed.
