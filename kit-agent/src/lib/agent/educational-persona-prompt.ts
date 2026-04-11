/** FormData·남용 방지: 교육 철학 systemPrompt 최대 길이 */
const MAX_EDUCATIONAL_PERSONA_PROMPT_CHARS = 12_000;

export function parseEducationalPersonaSystemPrompt(
  raw: FormDataEntryValue | null,
): string {
  if (typeof raw !== "string") return "";
  const t = raw.trim();
  if (!t) return "";
  return t.length > MAX_EDUCATIONAL_PERSONA_PROMPT_CHARS
    ? t.slice(0, MAX_EDUCATIONAL_PERSONA_PROMPT_CHARS)
    : t;
}
