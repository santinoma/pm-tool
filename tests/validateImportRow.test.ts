import { describe, expect, it } from "vitest";
import { validateClientImportRow, validateTaskImportRow } from "@/tenant/dataImport/csvImport";

describe("validateTaskImportRow", () => {
  const context = {
    validStatusNames: ["Open", "In Progress", "Done"],
    validUserEmails: ["alice@example.com", "bob@example.com"],
  };

  it("accepts a fully valid row", () => {
    const result = validateTaskImportRow(
      {
        title: "Do the thing",
        status: "Open",
        assigneeEmail: "alice@example.com",
        dueDate: "2026-09-01",
        estimatedHours: "3.5",
      },
      context,
    );
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("accepts a row with only the required title", () => {
    const result = validateTaskImportRow({ title: "Minimal" }, context);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects a missing title", () => {
    const result = validateTaskImportRow({ title: "" }, context);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("title ist erforderlich.");
  });

  it("rejects a whitespace-only title", () => {
    const result = validateTaskImportRow({ title: "   " }, context);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("title ist erforderlich.");
  });

  it("rejects an unknown status", () => {
    const result = validateTaskImportRow({ title: "T", status: "Nope" }, context);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('status "Nope" ist kein gültiger Status.');
  });

  it("rejects an unknown assigneeEmail", () => {
    const result = validateTaskImportRow({ title: "T", assigneeEmail: "nobody@example.com" }, context);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('assigneeEmail "nobody@example.com" ist keinem Benutzer zugeordnet.');
  });

  it("rejects an invalid dueDate", () => {
    const result = validateTaskImportRow({ title: "T", dueDate: "not-a-date" }, context);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('dueDate "not-a-date" ist kein gültiges ISO-Datum.');
  });

  it("rejects a negative estimatedHours", () => {
    const result = validateTaskImportRow({ title: "T", estimatedHours: "-2" }, context);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('estimatedHours "-2" ist keine gültige positive Zahl.');
  });

  it("rejects a non-numeric estimatedHours", () => {
    const result = validateTaskImportRow({ title: "T", estimatedHours: "abc" }, context);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('estimatedHours "abc" ist keine gültige positive Zahl.');
  });

  it("rejects a zero estimatedHours", () => {
    const result = validateTaskImportRow({ title: "T", estimatedHours: "0" }, context);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('estimatedHours "0" ist keine gültige positive Zahl.');
  });

  it("collects multiple errors on the same row", () => {
    const result = validateTaskImportRow(
      { title: "", status: "Nope", assigneeEmail: "x@example.com", dueDate: "bad", estimatedHours: "-1" },
      context,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(5);
  });
});

describe("validateClientImportRow", () => {
  it("accepts a valid row with note", () => {
    const result = validateClientImportRow({ name: "Acme GmbH", note: "VIP" });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("accepts a valid row without note", () => {
    const result = validateClientImportRow({ name: "Acme GmbH" });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects a missing name", () => {
    const result = validateClientImportRow({ name: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("name ist erforderlich.");
  });

  it("rejects a whitespace-only name", () => {
    const result = validateClientImportRow({ name: "   " });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("name ist erforderlich.");
  });
});
