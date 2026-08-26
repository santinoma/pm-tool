import { describe, expect, it } from "vitest";
import { renderMarkdownSafe } from "../src/tenant/collaboration/markdown";

describe("renderMarkdownSafe", () => {
  it("renders basic markdown to HTML", () => {
    expect(renderMarkdownSafe("# Title\n\nSome **bold** text.")).toContain("<strong>bold</strong>");
  });

  it("strips a script tag injected via markdown", () => {
    const html = renderMarkdownSafe('Hello <script>alert("xss")</script> world');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("alert(");
  });

  it("strips inline event handlers", () => {
    const html = renderMarkdownSafe('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });
});
