import { describe, expect, it } from "vitest";
import { canManageMembers, wouldDeactivateLastOwner, wouldRemoveLastOwner } from "../src/tenant/auth/roleGuard";

describe("wouldRemoveLastOwner", () => {
  it("blocks demoting the only owner", () => {
    const users = [{ id: "1", role: "owner" as const }, { id: "2", role: "member" as const }];
    expect(wouldRemoveLastOwner(users, "1", "admin")).toBe(true);
  });

  it("allows demoting an owner when another owner remains", () => {
    const users = [
      { id: "1", role: "owner" as const },
      { id: "2", role: "owner" as const },
    ];
    expect(wouldRemoveLastOwner(users, "1", "admin")).toBe(false);
  });

  it("allows promoting a member to owner", () => {
    const users = [{ id: "1", role: "owner" as const }, { id: "2", role: "member" as const }];
    expect(wouldRemoveLastOwner(users, "2", "owner")).toBe(false);
  });

  it("is a no-op check for non-owner targets", () => {
    const users = [{ id: "1", role: "owner" as const }, { id: "2", role: "member" as const }];
    expect(wouldRemoveLastOwner(users, "2", "admin")).toBe(false);
  });
});

describe("wouldDeactivateLastOwner", () => {
  it("blocks deactivating the only active owner", () => {
    const users = [
      { id: "1", role: "owner" as const, isActive: true },
      { id: "2", role: "member" as const, isActive: true },
    ];
    expect(wouldDeactivateLastOwner(users, "1")).toBe(true);
  });

  it("allows deactivating an owner when another active owner remains", () => {
    const users = [
      { id: "1", role: "owner" as const, isActive: true },
      { id: "2", role: "owner" as const, isActive: true },
    ];
    expect(wouldDeactivateLastOwner(users, "1")).toBe(false);
  });

  it("does not count an already-inactive owner as remaining", () => {
    const users = [
      { id: "1", role: "owner" as const, isActive: true },
      { id: "2", role: "owner" as const, isActive: false },
    ];
    expect(wouldDeactivateLastOwner(users, "1")).toBe(true);
  });

  it("is a no-op check for non-owner targets", () => {
    const users = [
      { id: "1", role: "owner" as const, isActive: true },
      { id: "2", role: "member" as const, isActive: true },
    ];
    expect(wouldDeactivateLastOwner(users, "2")).toBe(false);
  });
});

describe("canManageMembers", () => {
  it("allows owner and admin", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
  });

  it("disallows member", () => {
    expect(canManageMembers("member")).toBe(false);
  });
});
