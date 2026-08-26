const EMAIL_MENTION_PATTERN = /@[\w.+-]+@[\w.-]+\.\w+/g;

/**
 * Extrahiert alle @email-Erwähnungen aus einem Kommentartext (dedupliziert, führendes @ entfernt).
 * Ob die E-Mail zu einem echten Nutzer gehört, wird an anderer Stelle gegen die DB geprüft —
 * diese Funktion kennt keine Nutzerdaten, nur das Textmuster.
 */
export function extractMentionedEmails(text: string): string[] {
  const matches = text.match(EMAIL_MENTION_PATTERN) ?? [];
  return [...new Set(matches.map((match) => match.slice(1)))];
}
