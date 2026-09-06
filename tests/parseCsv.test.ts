import { describe, expect, it } from "vitest";
import { parseCsv } from "@/tenant/dataImport/csvImport";

describe("parseCsv", () => {
  it("parses a simple CSV with header and rows", () => {
    const csv = "title,status\nFoo,Open\nBar,Done";
    expect(parseCsv(csv)).toEqual([
      ["title", "status"],
      ["Foo", "Open"],
      ["Bar", "Done"],
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'title,note\n"Hello, world",fine';
    expect(parseCsv(csv)).toEqual([
      ["title", "note"],
      ["Hello, world", "fine"],
    ]);
  });

  it("handles escaped quotes inside quoted fields", () => {
    const csv = 'title\n"She said ""hi"""';
    expect(parseCsv(csv)).toEqual([["title"], ['She said "hi"']]);
  });

  it("handles empty fields", () => {
    const csv = "a,b,c\n1,,3";
    expect(parseCsv(csv)).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });

  it("handles a trailing newline without producing an extra empty row", () => {
    const csv = "a,b\n1,2\n";
    expect(parseCsv(csv)).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles CRLF line endings", () => {
    const csv = "a,b\r\n1,2\r\n3,4";
    expect(parseCsv(csv)).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("handles a quoted field containing an embedded newline", () => {
    const csv = 'title,note\n"multi\nline",ok';
    expect(parseCsv(csv)).toEqual([
      ["title", "note"],
      ["multi\nline", "ok"],
    ]);
  });

  it("returns an empty array for empty content", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("handles a single header-only row without trailing newline", () => {
    expect(parseCsv("title,status")).toEqual([["title", "status"]]);
  });
});
