import { describe, expect, it } from "vitest";
import { extractProjectScopedId } from "../src/proxy";

describe("extractProjectScopedId", () => {
  it("extracts the id from a project page path", () => {
    expect(extractProjectScopedId("/projects/abc-123/list")).toBe("abc-123");
    expect(extractProjectScopedId("/projects/abc-123/tasks/task-1")).toBe("abc-123");
    expect(extractProjectScopedId("/projects/abc-123")).toBe("abc-123");
  });

  it("extracts the id from a project API path", () => {
    expect(extractProjectScopedId("/api/tenant/projects/abc-123/budget")).toBe("abc-123");
    expect(extractProjectScopedId("/api/tenant/projects/abc-123/cycles")).toBe("abc-123");
  });

  it("does not treat /projects/new as a project id", () => {
    expect(extractProjectScopedId("/projects/new")).toBeNull();
  });

  it("returns null for the projects list page and unrelated paths", () => {
    expect(extractProjectScopedId("/projects")).toBeNull();
    expect(extractProjectScopedId("/dashboard")).toBeNull();
    expect(extractProjectScopedId("/api/tenant/projects")).toBeNull();
  });
});
