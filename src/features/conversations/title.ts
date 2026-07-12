const FALLBACK_CONVERSATION_TITLE = "New conversation";
const MAX_GENERATED_TITLE_LENGTH = 60;

export function buildConversationTitle(message: string): string {
  const normalized = message
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(?:[*_`~>#-]+\s*)+/, "")
    .replace(/\s*(?:[*_`~]+)+$/, "")
    .trim();

  if (!normalized) return FALLBACK_CONVERSATION_TITLE;
  if (normalized.length <= MAX_GENERATED_TITLE_LENGTH) return normalized;

  const candidate = normalized.slice(0, MAX_GENERATED_TITLE_LENGTH - 3).trimEnd();
  const wordBoundary = candidate.lastIndexOf(" ");
  const shortened = wordBoundary >= 20 ? candidate.slice(0, wordBoundary).trimEnd() : candidate;
  return `${shortened}...`;
}

export { FALLBACK_CONVERSATION_TITLE };
