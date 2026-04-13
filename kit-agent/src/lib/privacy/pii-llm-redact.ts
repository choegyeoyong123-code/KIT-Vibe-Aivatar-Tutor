import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * 잔여 인명·민감 토큰을 LLM으로 치환. 입력/출력은 로깅하지 않습니다.
 * `PII_LLM_GUARD=1` 이고 GOOGLE_API_KEY가 있을 때만 호출됩니다.
 */
export async function llmRedactResidualPii(
  text: string,
  opts?: { force?: boolean },
): Promise<string> {
  const key = process.env.GOOGLE_API_KEY?.trim();
  const allow = opts?.force === true || process.env.PII_LLM_GUARD === "1";
  if (!key || !allow) return text;

  const modelId = process.env.PII_GUARD_MODEL?.trim() || "gemini-1.5-flash";
  const gen = new GoogleGenerativeAI(key).getGenerativeModel({ model: modelId });
  const prompt = `You redact privacy from user-provided instructional text for an AI API.

Rules:
- Replace real person names (any language) with exactly [PROTECTED_INFO]
- Replace email-like and phone-like patterns if any remain with [PROTECTED_INFO]
- Preserve technical meaning, code tokens, math, URLs to public docs
- Do not add commentary. Return JSON only: {"sanitized": string}

TEXT:
${text.slice(0, 12_000)}`;

  const res = await gen.generateContent(prompt);
  const raw = res.response.text().trim();
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) return text;
  try {
    const j = JSON.parse(stripped.slice(start, end + 1)) as { sanitized?: string };
    if (typeof j.sanitized === "string" && j.sanitized.length) return j.sanitized;
  } catch {
    /* fallthrough */
  }
  return text;
}
