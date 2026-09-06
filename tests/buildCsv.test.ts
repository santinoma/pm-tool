import { describe, expect, it } from "vitest";
import { buildCsv } from "../src/tenant/dataExport/csvExport";

describe("buildCsv", () => {
  it("renders a header row from column labels and values in column order", () => {
    const csv = buildCsv(
      [{ title: "Fix bug", status: "Offen" }],
      [
        { key: "title", label: "Titel" },
        { key: "status", label: "Status" },
      ],
    );
    expect(csv).toBe("Titel,Status\r\nFix bug,Offen");
  });

  it("quotes values containing a comma", () => {
    const csv = buildCsv([{ title: "Design, Login-Seite" }], [{ key: "title", label: "Titel" }]);
    expect(csv).toBe('Titel\r\n"Design, Login-Seite"');
  });

  it("quotes values containing a double quote and doubles embedded quotes", () => {
    const csv = buildCsv([{ title: 'Say "hi"' }], [{ key: "title", label: "Titel" }]);
    expect(csv).toBe('Titel\r\n"Say ""hi"""');
  });

  it("quotes values containing a newline", () => {
    const csv = buildCsv([{ notes: "line1\nline2" }], [{ key: "notes", label: "Notizen" }]);
    expect(csv).toBe('Notizen\r\n"line1\nline2"');
  });

  it("quotes values containing a carriage return", () => {
    const csv = buildCsv([{ notes: "line1\r\nline2" }], [{ key: "notes", label: "Notizen" }]);
    expect(csv).toBe('Notizen\r\n"line1\r\nline2"');
  });

  it("returns only the header row when rows is empty", () => {
    const csv = buildCsv([], [{ key: "title", label: "Titel" }, { key: "status", label: "Status" }]);
    expect(csv).toBe("Titel,Status");
  });

  it("renders missing keys as empty strings instead of crashing", () => {
    const csv = buildCsv([{ title: "Only title" }], [
      { key: "title", label: "Titel" },
      { key: "assignee", label: "Assignee" },
    ]);
    expect(csv).toBe("Titel,Assignee\r\nOnly title,");
  });

  it("renders null and undefined values as empty strings", () => {
    const csv = buildCsv([{ a: null, b: undefined }], [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
    ]);
    expect(csv).toBe("A,B\r\n,");
  });

  it("stringifies numeric values correctly", () => {
    const csv = buildCsv([{ hours: 4.5 }, { hours: 0 }], [{ key: "hours", label: "Stunden" }]);
    expect(csv).toBe("Stunden\r\n4.5\r\n0");
  });

  it("stringifies boolean values correctly", () => {
    const csv = buildCsv([{ done: true }, { done: false }], [{ key: "done", label: "Erledigt" }]);
    expect(csv).toBe("Erledigt\r\ntrue\r\nfalse");
  });

  it("escapes header labels that themselves need quoting", () => {
    const csv = buildCsv([{ a: "x" }], [{ key: "a", label: "A, B" }]);
    expect(csv).toBe('"A, B"\r\nx');
  });

  it("handles multiple rows and columns together", () => {
    const csv = buildCsv(
      [
        { title: "Task 1", status: "Offen", assignee: "Alice" },
        { title: "Task 2", status: "Erledigt", assignee: null },
      ],
      [
        { key: "title", label: "Titel" },
        { key: "status", label: "Status" },
        { key: "assignee", label: "Assignee" },
      ],
    );
    expect(csv).toBe("Titel,Status,Assignee\r\nTask 1,Offen,Alice\r\nTask 2,Erledigt,");
  });
});
