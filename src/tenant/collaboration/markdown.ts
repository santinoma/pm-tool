import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

/**
 * Rendert Markdown zu HTML und sanitisiert das Ergebnis, bevor es ins DOM darf —
 * verhindert XSS über eingebettetes HTML/Script im Wiki-Inhalt.
 */
export function renderMarkdownSafe(markdown: string): string {
  const html = marked.parse(markdown, { async: false }) as string;
  return DOMPurify.sanitize(html);
}
