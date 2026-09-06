import { describe, expect, it } from "vitest";
import { parseCustomFieldValue, validateCustomFieldValue } from "../src/tenant/projects/customFieldValue";

describe("validateCustomFieldValue", () => {
  it("accepts any non-empty text", () => {
    expect(validateCustomFieldValue("text", "irgendwas").valid).toBe(true);
    expect(validateCustomFieldValue("text", "").valid).toBe(true);
  });

  it("validates numbers", () => {
    expect(validateCustomFieldValue("number", "42").valid).toBe(true);
    expect(validateCustomFieldValue("number", "3.14").valid).toBe(true);
    expect(validateCustomFieldValue("number", "abc").valid).toBe(false);
    expect(validateCustomFieldValue("number", "").valid).toBe(false);
  });

  it("validates dates", () => {
    expect(validateCustomFieldValue("date", "2026-01-01").valid).toBe(true);
    expect(validateCustomFieldValue("date", "not-a-date").valid).toBe(false);
  });

  it("validates select against options", () => {
    const options = ["low", "medium", "high"];
    expect(validateCustomFieldValue("select", "medium", options).valid).toBe(true);
    expect(validateCustomFieldValue("select", "urgent", options).valid).toBe(false);
  });

  it("validates multi_select as a JSON array of known options", () => {
    const options = ["frontend", "backend", "design"];
    expect(validateCustomFieldValue("multi_select", JSON.stringify(["frontend", "design"]), options).valid).toBe(
      true,
    );
    expect(validateCustomFieldValue("multi_select", JSON.stringify(["frontend", "ops"]), options).valid).toBe(false);
    expect(validateCustomFieldValue("multi_select", "not json", options).valid).toBe(false);
    expect(validateCustomFieldValue("multi_select", JSON.stringify("not an array"), options).valid).toBe(false);
  });

  it("validates person as a non-empty string", () => {
    expect(validateCustomFieldValue("person", "user-123").valid).toBe(true);
    expect(validateCustomFieldValue("person", "").valid).toBe(false);
  });
});

describe("parseCustomFieldValue", () => {
  it("parses numbers", () => {
    expect(parseCustomFieldValue("number", "42")).toBe(42);
  });

  it("parses dates", () => {
    const parsed = parseCustomFieldValue("date", "2026-01-01");
    expect(parsed).toBeInstanceOf(Date);
  });

  it("passes text and select through unchanged", () => {
    expect(parseCustomFieldValue("text", "hello")).toBe("hello");
    expect(parseCustomFieldValue("select", "medium")).toBe("medium");
  });

  it("parses multi_select as a string array", () => {
    expect(parseCustomFieldValue("multi_select", JSON.stringify(["a", "b"]))).toEqual(["a", "b"]);
    expect(parseCustomFieldValue("multi_select", "not json")).toEqual([]);
  });
});
