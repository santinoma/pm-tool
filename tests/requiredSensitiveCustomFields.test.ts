import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, Project, Task, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { POST as CREATE_FIELD } from "@/app/api/tenant/custom-fields/route";
import { PUT as PUT_TASK_FIELD } from "@/app/api/tenant/tasks/[id]/custom-fields/[fieldId]/route";
import { PUT as PUT_BUDGET_FIELD } from "@/app/api/tenant/budgets/[id]/custom-fields/[fieldId]/route";
import { PUT as PUT_WIKI_FIELD } from "@/app/api/tenant/wiki-pages/[id]/custom-fields/[fieldId]/route";
import { loadTaskDetail } from "@/app/(tenant)/(app)/projects/[id]/tasks/[taskId]/loadTaskDetail";

let tenant: Tenant;
let tenantDb: PrismaClient;
let owner: User;
let member: User;
let project: Project;
let task: Task;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

beforeEach(async () => {
  const subdomain = `reqsens-${Date.now()}`;
  await provisionTenant({ name: "Required Sensitive Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner@example.com", role: "owner" } });
  member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });

  project = await tenantDb.project.create({
    data: { name: "Req Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
    include: { workflow: { include: { statuses: true } } },
  });
  await tenantDb.projectMember.create({ data: { projectId: project.id, userId: member.id } });
  task = await tenantDb.task.create({
    data: {
      title: "Req Task",
      statusId: (await tenantDb.workflowStatus.findFirstOrThrow({ where: { workflow: { projects: { some: { id: project.id } } } } })).id,
      projects: { create: { projectId: project.id } },
    },
  });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Required custom fields", () => {
  it("creates a field with required/sensitive flags persisted", async () => {
    setCurrentUser(owner);
    const response = await CREATE_FIELD(
      new Request("http://tenant.local/api/tenant/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "risk", label: "Risk", type: "text", entityType: "task", required: true, sensitive: true }),
      }),
    );
    expect(response.status).toBe(201);
    const { field } = await response.json();
    expect(field.required).toBe(true);
    expect(field.sensitive).toBe(true);
  });

  it("rejects setting a required task field to an empty value", async () => {
    setCurrentUser(owner);
    const field = await tenantDb.customFieldDef.create({
      data: { projectId: project.id, key: "notes", label: "Notes", type: "text", options: [], required: true },
    });

    const response = await PUT_TASK_FIELD(
      new Request(`http://tenant.local/api/tenant/tasks/${task.id}/custom-fields/${field.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "  " }),
      }),
      { params: Promise.resolve({ id: task.id, fieldId: field.id }) },
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Pflichtfeld");
  });

  it("allows a non-empty value on a required task field", async () => {
    setCurrentUser(owner);
    const field = await tenantDb.customFieldDef.create({
      data: { projectId: project.id, key: "notes", label: "Notes", type: "text", options: [], required: true },
    });

    const response = await PUT_TASK_FIELD(
      new Request(`http://tenant.local/api/tenant/tasks/${task.id}/custom-fields/${field.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "Something" }),
      }),
      { params: Promise.resolve({ id: task.id, fieldId: field.id }) },
    );
    expect(response.status).toBe(200);
  });

  it("treats an empty multi_select array ('[]') as empty for a required field", async () => {
    setCurrentUser(owner);
    const field = await tenantDb.customFieldDef.create({
      data: { projectId: project.id, key: "tags", label: "Tags", type: "multi_select", options: ["a", "b"], required: true },
    });

    const response = await PUT_TASK_FIELD(
      new Request(`http://tenant.local/api/tenant/tasks/${task.id}/custom-fields/${field.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "[]" }),
      }),
      { params: Promise.resolve({ id: task.id, fieldId: field.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("rejects an empty value on a required budget field", async () => {
    setCurrentUser(owner);
    const budget = await tenantDb.budget.create({
      data: { title: "Budget", projectId: project.id, ownerId: owner.id },
    });
    const field = await tenantDb.customFieldDef.create({
      data: { projectId: project.id, key: "cost_center", label: "Cost Center", type: "text", options: [], entityType: "budget", required: true },
    });

    const response = await PUT_BUDGET_FIELD(
      new Request(`http://tenant.local/api/tenant/budgets/${budget.id}/custom-fields/${field.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "" }),
      }),
      { params: Promise.resolve({ id: budget.id, fieldId: field.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("rejects an empty value on a required wiki page field", async () => {
    setCurrentUser(owner);
    const wikiPage = await tenantDb.wikiPage.create({
      data: { title: "Page", content: "", projectId: project.id },
    });
    const field = await tenantDb.customFieldDef.create({
      data: { projectId: project.id, key: "owner_team", label: "Owner Team", type: "text", options: [], entityType: "wiki_page", required: true },
    });

    const response = await PUT_WIKI_FIELD(
      new Request(`http://tenant.local/api/tenant/wiki-pages/${wikiPage.id}/custom-fields/${field.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "" }),
      }),
      { params: Promise.resolve({ id: wikiPage.id, fieldId: field.id }) },
    );
    expect(response.status).toBe(400);
  });
});

describe("Sensitive custom fields", () => {
  it("hides a sensitive task field's value from a non-manager but shows it to a manager", async () => {
    const field = await tenantDb.customFieldDef.create({
      data: { projectId: project.id, key: "salary_note", label: "Salary Note", type: "text", options: [], sensitive: true },
    });
    await tenantDb.customFieldValue.create({ data: { fieldId: field.id, taskId: task.id, value: "Confidential" } });

    setCurrentUser(member);
    const memberView = await loadTaskDetail(
      { tenantDb, currentUser: member, entitledFeatures: new Set() },
      project.id,
      task.id,
    );
    expect(memberView.notFound).toBe(false);
    if (memberView.notFound) throw new Error("unreachable");
    expect(memberView.task.customValues.find((v) => v.fieldId === field.id)).toBeUndefined();

    setCurrentUser(owner);
    const ownerView = await loadTaskDetail(
      { tenantDb, currentUser: owner, entitledFeatures: new Set() },
      project.id,
      task.id,
    );
    expect(ownerView.notFound).toBe(false);
    if (ownerView.notFound) throw new Error("unreachable");
    expect(ownerView.task.customValues.find((v) => v.fieldId === field.id)?.value).toBe("Confidential");
  });
});
