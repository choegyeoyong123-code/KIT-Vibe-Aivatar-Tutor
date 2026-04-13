import { applyRegexPiiMask } from "@/lib/privacy/pii-regex";
import { llmRedactResidualPii } from "@/lib/privacy/pii-llm-redact";

/** 외부 LLM으로 보내기 전 사용자 문자열 정제(정규식 + 선택 LLM). */
export async function sanitizeUserPlaintextForLlm(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const { text: rx } = applyRegexPiiMask(trimmed);
  return llmRedactResidualPii(rx);
}
