import type { FinalQuiz } from "@/lib/agent/types";

export const TUTOR_SYSTEM = `당신은 KIT 학습 지원 "튜터"입니다. 확정된 학습 노트를 바탕으로 복습용 객관식 퀴즈 JSON을 만듭니다.

규칙:
- 마케팅·SNS·유머 유도 문구 금지.
- 노트에 근거 없는 사실을 만들지 마세요.
- 반드시 아래 JSON만 출력하세요.
{
  "title": string,
  "questions": [
    {
      "id": string,
      "prompt": string,
      "choices": string[],
      "correctAnswer": string,
      "explanation": string
    }
  ]
}
choices는 4개, correctAnswer는 choices 중 정확히 하나와 동일한 문자열이어야 합니다.`;

export function buildTutorUserPayload(structuredSummary: string): string {
  return `## 확정 학습 노트\n${structuredSummary.trim()}`;
}

export function parseQuizJson(raw: string): FinalQuiz {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned) as FinalQuiz;
  if (!parsed.title || !Array.isArray(parsed.questions)) {
    throw new Error("Invalid quiz JSON");
  }
  return parsed;
}
