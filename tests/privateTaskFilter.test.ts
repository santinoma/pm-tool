import { describe, expect, it } from "vitest";
import { canViewPrivateTask, privateTaskVisibilityFilter } from "../src/tenant/projectAccess/privateTaskFilter";

const owner = { id: "owner-1", role: "owner" } as any;
const admin = { id: "admin-1", role: "admin" } as any;
const member = { id: "member-1", role: "member" } as any;

describe("privateTaskVisibilityFilter", () => {
  it("returns no restriction for owner/admin", () => {
    expect(privateTaskVisibilityFilter(owner)).toEqual({});
    expect(privateTaskVisibilityFilter(admin)).toEqual({});
  });

  it("restricts members to non-private, own, or subscribed tasks", () => {
    const filter = privateTaskVisibilityFilter(member) as { OR: unknown[] };
    expect(filter.OR).toEqual([
      { isPrivate: false },
      { assigneeId: "member-1" },
      { subscribers: { some: { userId: "member-1" } } },
    ]);
  });
});

describe("canViewPrivateTask", () => {
  it("allows anyone to view a non-private task", () => {
    expect(canViewPrivateTask(member, { isPrivate: false, assigneeId: null }, false)).toBe(true);
  });

  it("allows owner/admin to view any private task", () => {
    expect(canViewPrivateTask(admin, { isPrivate: true, assigneeId: "someone-else" }, false)).toBe(true);
  });

  it("allows the assignee to view their own private task", () => {
    expect(canViewPrivateTask(member, { isPrivate: true, assigneeId: "member-1" }, false)).toBe(true);
  });

  it("allows a subscriber to view a private task", () => {
    expect(canViewPrivateTask(member, { isPrivate: true, assigneeId: "someone-else" }, true)).toBe(true);
  });

  it("denies a non-assignee, non-subscriber member", () => {
    expect(canViewPrivateTask(member, { isPrivate: true, assigneeId: "someone-else" }, false)).toBe(false);
  });
});
