import { describe, expect, it } from "vitest";
import { resolveApproverUserIds, computeOverallStatus } from "../src/tenant/timeTracking/approvalPolicy";

describe("resolveApproverUserIds", () => {
  const context = { budgetOwnerId: "owner-1", projectManagerId: "pm-1", submitterManagerId: "manager-1" };

  it("resolves budget_owner to the budget's owner", () => {
    const ids = resolveApproverUserIds([{ roleType: "budget_owner", specificUserId: null }], context);
    expect(ids).toEqual(["owner-1"]);
  });

  it("resolves project_manager to the project's manager", () => {
    const ids = resolveApproverUserIds([{ roleType: "project_manager", specificUserId: null }], context);
    expect(ids).toEqual(["pm-1"]);
  });

  it("skips project_manager when the budget has no project manager", () => {
    const ids = resolveApproverUserIds([{ roleType: "project_manager", specificUserId: null }], { ...context, projectManagerId: null });
    expect(ids).toEqual([]);
  });

  it("resolves submitter_manager to the submitter's manager", () => {
    const ids = resolveApproverUserIds([{ roleType: "submitter_manager", specificUserId: null }], context);
    expect(ids).toEqual(["manager-1"]);
  });

  it("falls back submitter_manager to the budget owner when the submitter has no manager", () => {
    const ids = resolveApproverUserIds([{ roleType: "submitter_manager", specificUserId: null }], { ...context, submitterManagerId: null });
    expect(ids).toEqual(["owner-1"]);
  });

  it("resolves specific_person to the configured user", () => {
    const ids = resolveApproverUserIds([{ roleType: "specific_person", specificUserId: "user-9" }], context);
    expect(ids).toEqual(["user-9"]);
  });

  it("deduplicates when multiple roles resolve to the same person", () => {
    const ids = resolveApproverUserIds(
      [
        { roleType: "budget_owner", specificUserId: null },
        { roleType: "specific_person", specificUserId: "owner-1" },
      ],
      context,
    );
    expect(ids).toEqual(["owner-1"]);
  });

  it("resolves multiple distinct approvers", () => {
    const ids = resolveApproverUserIds(
      [
        { roleType: "budget_owner", specificUserId: null },
        { roleType: "project_manager", specificUserId: null },
      ],
      context,
    );
    expect(ids.sort()).toEqual(["owner-1", "pm-1"]);
  });
});

describe("computeOverallStatus", () => {
  it("stays pending with no decisions", () => {
    expect(computeOverallStatus([], "any")).toBe("pending");
  });

  it("a single rejection rejects the entry regardless of mode", () => {
    expect(computeOverallStatus([{ status: "approved" }, { status: "rejected" }], "all")).toBe("rejected");
    expect(computeOverallStatus([{ status: "rejected" }], "any")).toBe("rejected");
  });

  it("'any' mode approves as soon as one decision is approved", () => {
    expect(computeOverallStatus([{ status: "pending" }, { status: "approved" }], "any")).toBe("approved");
  });

  it("'any' mode stays pending while every decision is still pending", () => {
    expect(computeOverallStatus([{ status: "pending" }, { status: "pending" }], "any")).toBe("pending");
  });

  it("'all' mode stays pending until every decision is approved", () => {
    expect(computeOverallStatus([{ status: "approved" }, { status: "pending" }], "all")).toBe("pending");
  });

  it("'all' mode approves once every decision is approved", () => {
    expect(computeOverallStatus([{ status: "approved" }, { status: "approved" }], "all")).toBe("approved");
  });
});
